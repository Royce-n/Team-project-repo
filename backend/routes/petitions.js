const express = require('express');
const router = express.Router();
const { body, query: queryValidator, param, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generatePetitionPDF } = require('../services/pdfGenerator');

/**
 * @route   POST /api/petitions
 * @desc    Create a new petition request (draft)
 * @access  Private (authenticated users)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('petitionTypeId').isInt().withMessage('Valid petition type ID is required'),
    body('uhNumber').notEmpty().withMessage('UH number is required'),
    body('phoneNumber').optional().isMobilePhone(),
    body('mailingAddress').optional().isString(),
    body('city').optional().isString(),
    body('state').optional().isString(),
    body('zip').optional().isPostalCode('US'),
    body('petitionData').isObject().withMessage('Petition data must be an object'),
    body('explanation').optional().isString(),
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

      const {
        petitionTypeId,
        uhNumber,
        phoneNumber,
        mailingAddress,
        city,
        state,
        zip,
        petitionData,
        explanation,
      } = req.body;

      const userId = req.user.id;

      // Verify petition type exists
      const typeCheck = await query(
        'SELECT id, requires_explanation FROM petition_types WHERE id = $1',
        [petitionTypeId]
      );

      if (typeCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid petition type',
        });
      }

      // Check if explanation is required
      if (typeCheck.rows[0].requires_explanation && !explanation) {
        return res.status(400).json({
          success: false,
          error: 'Explanation is required for this petition type',
        });
      }

      // Generate request number
      const requestNumberResult = await query('SELECT generate_request_number() as request_number');
      const requestNumber = requestNumberResult.rows[0].request_number;

      // Insert petition request
      const result = await query(
        `INSERT INTO petition_requests (
          request_number, user_id, petition_type_id, uh_number, phone_number,
          mailing_address, city, state, zip, petition_data, explanation, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
        RETURNING *`,
        [
          requestNumber,
          userId,
          petitionTypeId,
          uhNumber,
          phoneNumber,
          mailingAddress,
          city,
          state,
          zip,
          JSON.stringify(petitionData),
          explanation,
        ]
      );

      // Log action
      await query(
        `INSERT INTO approval_actions (petition_request_id, user_id, action_type, action_data)
         VALUES ($1, $2, 'created', $3)`,
        [result.rows[0].id, userId, JSON.stringify({ requestNumber })]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Petition draft created successfully',
      });
    } catch (error) {
      console.error('Error creating petition:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/petitions
 * @desc    List petition requests (filtered by user role)
 * @access  Private (authenticated users)
 */
router.get(
  '/',
  authenticateToken,
  [
    queryValidator('status').optional().isIn(['draft', 'submitted', 'pending', 'in_review', 'approved', 'rejected', 'returned']),
    queryValidator('page').optional().isInt({ min: 1 }),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
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

      const { status, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id;
      const userRole = req.user.role;

      let queryText = `
        SELECT
          pr.*,
          pt.type_name,
          pt.type_number,
          u.name as student_name,
          u.email as student_email,
          COUNT(*) OVER() as total_count
        FROM petition_requests pr
        JOIN petition_types pt ON pr.petition_type_id = pt.id
        JOIN users u ON pr.user_id = u.id
        WHERE 1=1
      `;

      const queryParams = [];
      let paramCount = 0;

      // Role-based filtering
      if (!['admin', 'manager'].includes(userRole)) {
        // Regular users see only their own petitions
        queryText += ` AND pr.user_id = $${++paramCount}`;
        queryParams.push(userId);

        // TODO: Add approver logic - approvers see petitions assigned to them
        // Check if user is an approver
        const approverCheck = await query(
          'SELECT approver_role FROM approver_assignments WHERE user_id = $1 AND is_active = TRUE',
          [userId]
        );

        if (approverCheck.rows.length > 0) {
          // User is an approver - show petitions they need to review
          const approverRoles = approverCheck.rows.map((r) => r.approver_role);
          queryText = queryText.replace(
            'WHERE 1=1',
            `WHERE (pr.user_id = $${paramCount} OR EXISTS (
              SELECT 1 FROM approval_steps ast
              WHERE ast.petition_request_id = pr.id
              AND ast.approver_role = ANY($${++paramCount})
              AND ast.status IN ('pending', 'in_review')
            ))`
          );
          queryParams.push(approverRoles);
        }
      }

      // Status filter
      if (status) {
        queryText += ` AND pr.status = $${++paramCount}`;
        queryParams.push(status);
      }

      // Ordering and pagination
      queryText += ` ORDER BY pr.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      res.json({
        success: true,
        data: result.rows.map((row) => {
          const { total_count, ...petition } = row;
          return petition;
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching petitions:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/petitions/:id
 * @desc    Get a specific petition request with approval steps
 * @access  Private (petition owner, approvers, or admin)
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch petition with type information
    const petitionResult = await query(
      `SELECT
        pr.*,
        pt.type_name,
        pt.type_number,
        pt.description as petition_type_description,
        pt.approval_chain,
        u.name as student_name,
        u.email as student_email
       FROM petition_requests pr
       JOIN petition_types pt ON pr.petition_type_id = pt.id
       JOIN users u ON pr.user_id = u.id
       WHERE pr.id = $1`,
      [id]
    );

    if (petitionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionResult.rows[0];

    // Check access permissions
    const isOwner = petition.user_id === userId;
    const isAdmin = ['admin', 'manager'].includes(userRole);

    // Check if user is an approver for this petition
    const approverCheck = await query(
      `SELECT 1 FROM approval_steps ast
       WHERE ast.petition_request_id = $1
       AND ast.approver_user_id = $2`,
      [id, userId]
    );
    const isApprover = approverCheck.rows.length > 0;

    if (!isOwner && !isAdmin && !isApprover) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Fetch approval steps
    const stepsResult = await query(
      `SELECT
        ast.*,
        u.name as approver_name,
        u.email as approver_email,
        si.image_format as signature_format
       FROM approval_steps ast
       LEFT JOIN users u ON ast.approver_user_id = u.id
       LEFT JOIN signature_images si ON ast.signature_image_id = si.id
       WHERE ast.petition_request_id = $1
       ORDER BY ast.step_order ASC`,
      [id]
    );

    // Fetch stored PDFs
    const pdfsResult = await query(
      `SELECT id, version, file_name, file_path, file_size, is_final, created_at
       FROM stored_pdfs
       WHERE petition_request_id = $1
       ORDER BY version DESC`,
      [id]
    );

    // Fetch action history
    const actionsResult = await query(
      `SELECT
        aa.*,
        u.name as user_name,
        u.email as user_email
       FROM approval_actions aa
       JOIN users u ON aa.user_id = u.id
       WHERE aa.petition_request_id = $1
       ORDER BY aa.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        petition,
        approvalSteps: stepsResult.rows,
        storedPdfs: pdfsResult.rows,
        actionHistory: actionsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching petition:', error);
    next(error);
  }
});

/**
 * @route   PUT /api/petitions/:id
 * @desc    Update a petition request (only drafts can be updated)
 * @access  Private (petition owner)
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if petition exists and is a draft
    const petitionCheck = await query(
      'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
      [id]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];

    if (petition.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (petition.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft petitions can be updated',
      });
    }

    // Update petition
    const {
      uhNumber,
      phoneNumber,
      mailingAddress,
      city,
      state,
      zip,
      petitionData,
      explanation,
    } = req.body;

    const result = await query(
      `UPDATE petition_requests
       SET uh_number = COALESCE($1, uh_number),
           phone_number = COALESCE($2, phone_number),
           mailing_address = COALESCE($3, mailing_address),
           city = COALESCE($4, city),
           state = COALESCE($5, state),
           zip = COALESCE($6, zip),
           petition_data = COALESCE($7, petition_data),
           explanation = COALESCE($8, explanation),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [uhNumber, phoneNumber, mailingAddress, city, state, zip, JSON.stringify(petitionData), explanation, id]
    );

    // Log action
    await query(
      `INSERT INTO approval_actions (petition_request_id, user_id, action_type)
       VALUES ($1, $2, 'updated')`,
      [id, userId]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Petition updated successfully',
    });
  } catch (error) {
    console.error('Error updating petition:', error);
    next(error);
  }
});

/**
 * @route   POST /api/petitions/:id/submit
 * @desc    Submit a petition for approval (transitions from draft to submitted)
 * @access  Private (petition owner)
 */
router.post('/:id/submit', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if petition exists and is a draft
    const petitionCheck = await query(
      `SELECT pr.*, pt.approval_chain
       FROM petition_requests pr
       JOIN petition_types pt ON pr.petition_type_id = pt.id
       WHERE pr.id = $1`,
      [id]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];

    if (petition.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (petition.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft petitions can be submitted',
      });
    }

    // Check if user has uploaded a signature
    const signatureCheck = await query(
      'SELECT id FROM signature_images WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    if (signatureCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload your signature before submitting',
      });
    }

    // Begin transaction
    await query('BEGIN');

    try {
      // Update petition status
      await query(
        `UPDATE petition_requests
         SET status = 'submitted',
             submitted_at = CURRENT_TIMESTAMP,
             current_approval_step = 1
         WHERE id = $1`,
        [id]
      );

      // Create approval steps based on approval chain
      const approvalChain = petition.approval_chain;
      for (let i = 0; i < approvalChain.length; i++) {
        const role = approvalChain[i];
        await query(
          `INSERT INTO approval_steps (petition_request_id, step_order, approver_role, status)
           VALUES ($1, $2, $3, $4)`,
          [id, i + 1, role, i === 0 ? 'in_review' : 'pending']
        );
      }

      // Log action
      await query(
        `INSERT INTO approval_actions (petition_request_id, user_id, action_type)
         VALUES ($1, $2, 'submitted')`,
        [id, userId]
      );

      await query('COMMIT');

      // Generate initial PDF after successful submission
      try {
        await generatePetitionPDF(id);
        console.log(`PDF generated for petition ${id}`);
      } catch (pdfError) {
        console.error(`Error generating PDF for petition ${id}:`, pdfError);
        // Don't fail the submission if PDF generation fails
      }

      res.json({
        success: true,
        message: 'Petition submitted successfully',
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error submitting petition:', error);
    next(error);
  }
});

/**
 * @route   DELETE /api/petitions/:id
 * @desc    Delete a petition request (only drafts)
 * @access  Private (petition owner or admin)
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const petitionCheck = await query(
      'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
      [id]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];
    const isOwner = petition.user_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (petition.status !== 'draft' && !isAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Only draft petitions can be deleted by users',
      });
    }

    await query('DELETE FROM petition_requests WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Petition deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting petition:', error);
    next(error);
  }
});

/**
 * @route   GET /api/petitions/types
 * @desc    Get all available petition types
 * @access  Private (authenticated users)
 */
router.get('/types/list', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, type_number, type_name, description, requires_explanation, approval_chain
       FROM petition_types
       ORDER BY type_number ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching petition types:', error);
    next(error);
  }
});

module.exports = router;
