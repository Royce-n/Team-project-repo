const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/users/:userId/approver-roles
 * @desc    Get approver role assignments for a user
 * @access  Private (admin only)
 */
router.get(
  '/:userId/approver-roles',
  authenticateToken,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const result = await query(
        `SELECT id, approver_role, department, is_active, created_at
         FROM approver_assignments
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/users/:userId/approver-roles
 * @desc    Assign approver roles to a user
 * @access  Private (admin only)
 */
router.post(
  '/:userId/approver-roles',
  authenticateToken,
  requireRole(['admin']),
  [
    body('roles').isArray().withMessage('Roles must be an array'),
    body('roles.*').isIn(['advisor', 'chairperson', 'dean', 'provost']).withMessage('Invalid approver role'),
    body('department').optional().isString(),
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

      const { userId } = req.params;
      const { roles, department } = req.body;

      await query('BEGIN');

      try {
        // Deactivate all existing approver role assignments for this user
        await query(
          `UPDATE approver_assignments
           SET is_active = FALSE
           WHERE user_id = $1`,
          [userId]
        );

        // Insert new approver role assignments
        for (const role of roles) {
          await query(
            `INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT (user_id, approver_role) WHERE is_active = TRUE
             DO UPDATE SET department = $3, is_active = TRUE`,
            [userId, role, department || null]
          );
        }

        await query('COMMIT');

        res.json({
          success: true,
          message: 'Approver roles updated successfully',
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/users/:userId/approver-roles/:role
 * @desc    Remove a specific approver role from a user
 * @access  Private (admin only)
 */
router.delete(
  '/:userId/approver-roles/:role',
  authenticateToken,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const { userId, role } = req.params;

      await query(
        `UPDATE approver_assignments
         SET is_active = FALSE
         WHERE user_id = $1 AND approver_role = $2`,
        [userId, role]
      );

      res.json({
        success: true,
        message: 'Approver role removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
