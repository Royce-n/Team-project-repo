const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generatePetitionPDF } = require('../services/pdfGenerator');

/**
 * Helper function to check if user is an approver for a specific role
 */
async function isApproverForRole(userId, role) {
  const result = await query(
    `SELECT 1 FROM approver_assignments
     WHERE user_id = $1 AND approver_role = $2 AND is_active = TRUE`,
    [userId, role]
  );
  return result.rows.length > 0;
}

/**
 * @route   POST /api/approvals/:petitionId/approve
 * @desc    Approve a petition at current step
 * @access  Private (assigned approver)
 */
router.post(
  '/:petitionId/approve',
  authenticateToken,
  [
    body('comments').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { petitionId } = req.params;
      const { comments } = req.body;
      const userId = req.user.id;

      await query('BEGIN');

      try {
        // Get petition with current step
        const petitionResult = await query(
          `SELECT pr.*, pt.approval_chain
           FROM petition_requests pr
           JOIN petition_types pt ON pr.petition_type_id = pt.id
           WHERE pr.id = $1`,
          [petitionId]
        );

        if (petitionResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: 'Petition not found',
          });
        }

        const petition = petitionResult.rows[0];

        // Check if petition is in submitted or pending state
        if (!['submitted', 'pending', 'in_review'].includes(petition.status)) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Petition is not in a state that can be approved',
          });
        }

        // Get current approval step
        const currentStep = petition.current_approval_step;
        const stepResult = await query(
          `SELECT * FROM approval_steps
           WHERE petition_request_id = $1 AND step_order = $2`,
          [petitionId, currentStep]
        );

        if (stepResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'No active approval step found',
          });
        }

        const step = stepResult.rows[0];

        // Check if user has permission to approve (is an approver for this role)
        const hasPermission = await isApproverForRole(userId, step.approver_role);
        if (!hasPermission && req.user.role !== 'admin') {
          await query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to approve this petition',
          });
        }

        // Get user's active signature
        const signatureResult = await query(
          `SELECT id FROM signature_images
           WHERE user_id = $1 AND is_active = TRUE
           ORDER BY uploaded_at DESC LIMIT 1`,
          [userId]
        );

        if (signatureResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Please upload your signature before approving',
          });
        }

        const signatureId = signatureResult.rows[0].id;

        // Update approval step
        await query(
          `UPDATE approval_steps
           SET status = 'approved',
               decision = 'approved',
               approver_user_id = $1,
               comments = $2,
               signature_image_id = $3,
               reviewed_at = CURRENT_TIMESTAMP,
               completed_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [userId, comments, signatureId, step.id]
        );

        // Check if this is the last step
        const approvalChain = petition.approval_chain;
        const isLastStep = currentStep >= approvalChain.length;

        if (isLastStep) {
          // All approvals complete - mark petition as approved
          await query(
            `UPDATE petition_requests
             SET status = 'approved',
                 completed_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [petitionId]
          );

          // TODO: Generate final PDF with all signatures
        } else {
          // Move to next approval step
          const nextStep = currentStep + 1;
          await query(
            `UPDATE petition_requests
             SET current_approval_step = $1,
                 status = 'pending'
             WHERE id = $2`,
            [nextStep, petitionId]
          );

          // Mark next step as in_review
          await query(
            `UPDATE approval_steps
             SET status = 'in_review',
                 assigned_at = CURRENT_TIMESTAMP
             WHERE petition_request_id = $1 AND step_order = $2`,
            [petitionId, nextStep]
          );

          // TODO: Generate intermediate PDF with current signatures
        }

        // Log action
        await query(
          `INSERT INTO approval_actions (petition_request_id, approval_step_id, user_id, action_type, comments)
           VALUES ($1, $2, $3, 'approved', $4)`,
          [petitionId, step.id, userId, comments]
        );

        await query('COMMIT');

        // Generate PDF with updated signatures after approval
        try {
          await generatePetitionPDF(petitionId);
          console.log(`PDF generated for petition ${petitionId} after approval at step ${currentStep}`);
        } catch (pdfError) {
          console.error(`Error generating PDF for petition ${petitionId}:`, pdfError);
          // Don't fail the approval if PDF generation fails
        }

        res.json({
          success: true,
          message: isLastStep ? 'Petition fully approved' : 'Petition approved and moved to next step',
          data: {
            petitionId,
            currentStep,
            isComplete: isLastStep,
          },
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error approving petition:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/approvals/:petitionId/reject
 * @desc    Reject a petition
 * @access  Private (assigned approver)
 */
router.post(
  '/:petitionId/reject',
  authenticateToken,
  [
    body('comments').notEmpty().withMessage('Comments are required when rejecting'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { petitionId } = req.params;
      const { comments } = req.body;
      const userId = req.user.id;

      await query('BEGIN');

      try {
        // Get petition with current step
        const petitionResult = await query(
          'SELECT * FROM petition_requests WHERE id = $1',
          [petitionId]
        );

        if (petitionResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: 'Petition not found',
          });
        }

        const petition = petitionResult.rows[0];

        if (!['submitted', 'pending', 'in_review'].includes(petition.status)) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Petition is not in a state that can be rejected',
          });
        }

        // Get current approval step
        const currentStep = petition.current_approval_step;
        const stepResult = await query(
          `SELECT * FROM approval_steps
           WHERE petition_request_id = $1 AND step_order = $2`,
          [petitionId, currentStep]
        );

        if (stepResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'No active approval step found',
          });
        }

        const step = stepResult.rows[0];

        // Check if user has permission to reject
        const hasPermission = await isApproverForRole(userId, step.approver_role);
        if (!hasPermission && req.user.role !== 'admin') {
          await query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to reject this petition',
          });
        }

        // Get user's active signature (for rejection record)
        const signatureResult = await query(
          `SELECT id FROM signature_images
           WHERE user_id = $1 AND is_active = TRUE
           ORDER BY uploaded_at DESC LIMIT 1`,
          [userId]
        );

        const signatureId = signatureResult.rows.length > 0 ? signatureResult.rows[0].id : null;

        // Update approval step
        await query(
          `UPDATE approval_steps
           SET status = 'rejected',
               decision = 'disapproved',
               approver_user_id = $1,
               comments = $2,
               signature_image_id = $3,
               reviewed_at = CURRENT_TIMESTAMP,
               completed_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [userId, comments, signatureId, step.id]
        );

        // Mark petition as rejected
        await query(
          `UPDATE petition_requests
           SET status = 'rejected',
               completed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [petitionId]
        );

        // Log action
        await query(
          `INSERT INTO approval_actions (petition_request_id, approval_step_id, user_id, action_type, comments)
           VALUES ($1, $2, $3, 'rejected', $4)`,
          [petitionId, step.id, userId, comments]
        );

        await query('COMMIT');

        res.json({
          success: true,
          message: 'Petition rejected',
          data: {
            petitionId,
            comments,
          },
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error rejecting petition:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/approvals/:petitionId/return
 * @desc    Return a petition to the student for additional information
 * @access  Private (assigned approver)
 */
router.post(
  '/:petitionId/return',
  authenticateToken,
  [
    body('comments').notEmpty().withMessage('Comments are required when returning'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { petitionId } = req.params;
      const { comments } = req.body;
      const userId = req.user.id;

      await query('BEGIN');

      try {
        // Get petition with current step
        const petitionResult = await query(
          'SELECT * FROM petition_requests WHERE id = $1',
          [petitionId]
        );

        if (petitionResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: 'Petition not found',
          });
        }

        const petition = petitionResult.rows[0];

        if (!['submitted', 'pending', 'in_review'].includes(petition.status)) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Petition is not in a state that can be returned',
          });
        }

        // Get current approval step
        const currentStep = petition.current_approval_step;
        const stepResult = await query(
          `SELECT * FROM approval_steps
           WHERE petition_request_id = $1 AND step_order = $2`,
          [petitionId, currentStep]
        );

        if (stepResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'No active approval step found',
          });
        }

        const step = stepResult.rows[0];

        // Check if user has permission to return
        const hasPermission = await isApproverForRole(userId, step.approver_role);
        if (!hasPermission && req.user.role !== 'admin') {
          await query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to return this petition',
          });
        }

        // Update approval step
        await query(
          `UPDATE approval_steps
           SET status = 'returned',
               approver_user_id = $1,
               comments = $2,
               reviewed_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [userId, comments, step.id]
        );

        // Mark petition as returned
        await query(
          `UPDATE petition_requests
           SET status = 'returned'
           WHERE id = $1`,
          [petitionId]
        );

        // Log action
        await query(
          `INSERT INTO approval_actions (petition_request_id, approval_step_id, user_id, action_type, comments)
           VALUES ($1, $2, $3, 'returned', $4)`,
          [petitionId, step.id, userId, comments]
        );

        await query('COMMIT');

        res.json({
          success: true,
          message: 'Petition returned to student',
          data: {
            petitionId,
            comments,
          },
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error returning petition:', error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/approvals/:petitionId/resubmit
 * @desc    Resubmit a returned petition after making changes
 * @access  Private (petition owner)
 */
router.post(
  '/:petitionId/resubmit',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { petitionId } = req.params;
      const userId = req.user.id;

      await query('BEGIN');

      try {
        // Get petition
        const petitionResult = await query(
          `SELECT pr.*, pt.approval_chain
           FROM petition_requests pr
           JOIN petition_types pt ON pr.petition_type_id = pt.id
           WHERE pr.id = $1`,
          [petitionId]
        );

        if (petitionResult.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: 'Petition not found',
          });
        }

        const petition = petitionResult.rows[0];

        // Check ownership
        if (petition.user_id !== userId) {
          await query('ROLLBACK');
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }

        // Check if petition is returned
        if (petition.status !== 'returned') {
          await query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Only returned petitions can be resubmitted',
          });
        }

        // Reset petition to the step where it was returned
        const currentStep = petition.current_approval_step;

        await query(
          `UPDATE petition_requests
           SET status = 'pending'
           WHERE id = $1`,
          [petitionId]
        );

        // Reset the current step to in_review
        await query(
          `UPDATE approval_steps
           SET status = 'in_review',
               assigned_at = CURRENT_TIMESTAMP
           WHERE petition_request_id = $1 AND step_order = $2`,
          [petitionId, currentStep]
        );

        // Log action
        await query(
          `INSERT INTO approval_actions (petition_request_id, user_id, action_type)
           VALUES ($1, $2, 'submitted')`,
          [petitionId, userId]
        );

        await query('COMMIT');

        res.json({
          success: true,
          message: 'Petition resubmitted successfully',
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error resubmitting petition:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/approvals/my-queue
 * @desc    Get petitions awaiting approval from current user
 * @access  Private (approvers)
 */
router.get('/my-queue', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's approver roles
    const rolesResult = await query(
      `SELECT approver_role FROM approver_assignments
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (rolesResult.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'You are not assigned as an approver',
      });
    }

    const approverRoles = rolesResult.rows.map((r) => r.approver_role);

    // Get petitions awaiting approval from this user
    const result = await query(
      `SELECT
        pr.*,
        pt.type_name,
        pt.type_number,
        u.name as student_name,
        u.email as student_email,
        ast.step_order,
        ast.approver_role,
        ast.status as step_status
       FROM petition_requests pr
       JOIN petition_types pt ON pr.petition_type_id = pt.id
       JOIN users u ON pr.user_id = u.id
       JOIN approval_steps ast ON pr.id = ast.petition_request_id
       WHERE ast.approver_role = ANY($1)
       AND ast.status IN ('pending', 'in_review')
       AND pr.status IN ('submitted', 'pending', 'in_review')
       ORDER BY pr.created_at ASC`,
      [approverRoles]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching approval queue:', error);
    next(error);
  }
});

module.exports = router;
