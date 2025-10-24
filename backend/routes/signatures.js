const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   POST /api/signatures/upload
 * @desc    Upload or update user signature image
 * @access  Private (authenticated users)
 */
router.post(
  '/upload',
  authenticateToken,
  [
    body('imageData')
      .notEmpty()
      .withMessage('Image data is required')
      .isBase64()
      .withMessage('Image must be base64 encoded'),
    body('imageFormat')
      .notEmpty()
      .isIn(['png', 'jpg', 'jpeg', 'svg'])
      .withMessage('Image format must be png, jpg, jpeg, or svg'),
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

      const { imageData, imageFormat } = req.body;
      const userId = req.user.id;

      // Calculate file size (base64 to bytes)
      const fileSize = Math.ceil((imageData.length * 3) / 4);

      // Check file size limit (2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds 2MB limit',
        });
      }

      // Deactivate existing active signatures
      await query(
        'UPDATE signature_images SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
        [userId]
      );

      // Insert new signature
      const result = await query(
        `INSERT INTO signature_images (user_id, image_data, image_format, file_size, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, user_id, image_format, file_size, uploaded_at, is_active`,
        [userId, imageData, imageFormat.toLowerCase(), fileSize]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          userId: result.rows[0].user_id,
          imageFormat: result.rows[0].image_format,
          fileSize: result.rows[0].file_size,
          uploadedAt: result.rows[0].uploaded_at,
          isActive: result.rows[0].is_active,
        },
        message: 'Signature uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading signature:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/signatures/my-signature
 * @desc    Get current user's active signature
 * @access  Private (authenticated users)
 */
router.get('/my-signature', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, user_id, image_data, image_format, file_size, uploaded_at, is_active
       FROM signature_images
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active signature found',
      });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        imageData: result.rows[0].image_data,
        imageFormat: result.rows[0].image_format,
        fileSize: result.rows[0].file_size,
        uploadedAt: result.rows[0].uploaded_at,
        isActive: result.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error('Error fetching signature:', error);
    next(error);
  }
});

/**
 * @route   GET /api/signatures/user/:userId
 * @desc    Get a specific user's active signature (admin/approvers only)
 * @access  Private (admin, manager, or approvers)
 */
router.get(
  '/user/:userId',
  authenticateToken,
  requireRole(['admin', 'manager', 'advisor', 'chairperson', 'dean', 'provost']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const result = await query(
        `SELECT id, user_id, image_data, image_format, file_size, uploaded_at, is_active
         FROM signature_images
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY uploaded_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active signature found for this user',
        });
      }

      res.json({
        success: true,
        data: {
          id: result.rows[0].id,
          userId: result.rows[0].user_id,
          imageData: result.rows[0].image_data,
          imageFormat: result.rows[0].image_format,
          fileSize: result.rows[0].file_size,
          uploadedAt: result.rows[0].uploaded_at,
          isActive: result.rows[0].is_active,
        },
      });
    } catch (error) {
      console.error('Error fetching user signature:', error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/signatures/my-signature
 * @desc    Delete current user's active signature
 * @access  Private (authenticated users)
 */
router.delete('/my-signature', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM signature_images WHERE user_id = $1 AND is_active = TRUE RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active signature found',
      });
    }

    res.json({
      success: true,
      message: 'Signature deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting signature:', error);
    next(error);
  }
});

/**
 * @route   GET /api/signatures/history
 * @desc    Get user's signature upload history
 * @access  Private (authenticated users)
 */
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, image_format, file_size, uploaded_at, is_active
       FROM signature_images
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        imageFormat: row.image_format,
        fileSize: row.file_size,
        uploadedAt: row.uploaded_at,
        isActive: row.is_active,
      })),
    });
  } catch (error) {
    console.error('Error fetching signature history:', error);
    next(error);
  }
});

module.exports = router;
