const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generatePetitionPDF, getPDFPath } = require('../services/pdfGenerator');
const path = require('path');
const fs = require('fs').promises;

/**
 * @route   POST /api/pdfs/generate/:petitionId
 * @desc    Generate PDF for a petition
 * @access  Private (petition owner, approvers, or admin)
 */
router.post(
  '/generate/:petitionId',
  authenticateToken,
  requireRole(['admin', 'manager', 'advisor', 'chairperson', 'dean', 'provost']),
  async (req, res, next) => {
    try {
      const { petitionId } = req.params;

      // Check if petition exists
      const petitionCheck = await query(
        'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
        [petitionId]
      );

      if (petitionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Petition not found',
        });
      }

      // Generate PDF
      const pdfInfo = await generatePetitionPDF(petitionId);

      res.json({
        success: true,
        data: pdfInfo,
        message: 'PDF generated successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/pdfs/:petitionId/download
 * @desc    Download the latest PDF for a petition
 * @access  Private (petition owner, approvers, or admin)
 */
router.get('/:petitionId/download', authenticateToken, async (req, res, next) => {
  try {
    const { petitionId } = req.params;
    const { version } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if petition exists and user has access
    const petitionCheck = await query(
      'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
      [petitionId]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];
    const isOwner = petition.user_id === userId;
    const isAdmin = ['admin', 'manager'].includes(userRole);

    // Check if user is an approver
    const approverCheck = await query(
      `SELECT 1 FROM approval_steps
       WHERE petition_request_id = $1 AND approver_user_id = $2`,
      [petitionId, userId]
    );
    const isApprover = approverCheck.rows.length > 0;

    if (!isOwner && !isAdmin && !isApprover) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get PDF path
    const pdfPath = await getPDFPath(petitionId, version);

    // Check if file exists
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found',
      });
    }

    // Send file
    res.download(pdfPath, path.basename(pdfPath), (err) => {
      if (err) {
        console.error('Error downloading PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error downloading PDF',
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in PDF download:', error);
    next(error);
  }
});

/**
 * @route   GET /api/pdfs/:petitionId/view
 * @desc    View PDF in browser (inline)
 * @access  Private (petition owner, approvers, or admin)
 */
router.get('/:petitionId/view', authenticateToken, async (req, res, next) => {
  try {
    const { petitionId } = req.params;
    const { version } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check access (same as download)
    const petitionCheck = await query(
      'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
      [petitionId]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];
    const isOwner = petition.user_id === userId;
    const isAdmin = ['admin', 'manager'].includes(userRole);

    const approverCheck = await query(
      `SELECT 1 FROM approval_steps
       WHERE petition_request_id = $1 AND approver_user_id = $2`,
      [petitionId, userId]
    );
    const isApprover = approverCheck.rows.length > 0;

    if (!isOwner && !isAdmin && !isApprover) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get PDF path
    const pdfPath = await getPDFPath(petitionId, version);

    // Check if file exists
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found',
      });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(pdfPath)}"`);

    // Send file
    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error('Error viewing PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error viewing PDF',
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in PDF view:', error);
    next(error);
  }
});

/**
 * @route   GET /api/pdfs/:petitionId/versions
 * @desc    Get all PDF versions for a petition
 * @access  Private (petition owner, approvers, or admin)
 */
router.get('/:petitionId/versions', authenticateToken, async (req, res, next) => {
  try {
    const { petitionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check access
    const petitionCheck = await query(
      'SELECT id, user_id, status FROM petition_requests WHERE id = $1',
      [petitionId]
    );

    if (petitionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Petition not found',
      });
    }

    const petition = petitionCheck.rows[0];
    const isOwner = petition.user_id === userId;
    const isAdmin = ['admin', 'manager'].includes(userRole);

    const approverCheck = await query(
      `SELECT 1 FROM approval_steps
       WHERE petition_request_id = $1 AND approver_user_id = $2`,
      [petitionId, userId]
    );
    const isApprover = approverCheck.rows.length > 0;

    if (!isOwner && !isAdmin && !isApprover) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get all PDF versions
    const result = await query(
      `SELECT
        id, version, file_name, file_size, is_final, created_at,
        generation_method
       FROM stored_pdfs
       WHERE petition_request_id = $1
       ORDER BY version DESC`,
      [petitionId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching PDF versions:', error);
    next(error);
  }
});

module.exports = router;
