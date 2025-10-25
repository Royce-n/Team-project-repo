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
      console.log('[GET approver-roles] Request received for userId:', req.params.userId);
      console.log('[GET approver-roles] User role:', req.user?.role);
      const { userId } = req.params;

      const result = await query(
        `SELECT id, approver_role, department, is_active, assigned_at
         FROM approver_assignments
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY assigned_at DESC`,
        [userId]
      );

      console.log('[GET approver-roles] Found roles:', result.rows);
      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('[GET approver-roles] Error:', error);
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
      console.log('[POST approver-roles] Request received for userId:', req.params.userId);
      console.log('[POST approver-roles] User role:', req.user?.role);
      console.log('[POST approver-roles] Request body:', req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[POST approver-roles] Validation errors:', errors.array());
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
        // First, get all existing approver roles for this user
        const existingRoles = await query(
          `SELECT approver_role FROM approver_assignments
           WHERE user_id = $1 AND is_active = TRUE`,
          [userId]
        );
        const existingRoleNames = existingRoles.rows.map(r => r.approver_role);

        // Deactivate roles that are no longer selected
        const rolesToDeactivate = existingRoleNames.filter(r => !roles.includes(r));
        for (const role of rolesToDeactivate) {
          await query(
            `UPDATE approver_assignments
             SET is_active = FALSE
             WHERE user_id = $1 AND approver_role = $2`,
            [userId, role]
          );
        }

        // Insert or update selected roles
        for (const role of roles) {
          // Check if this role already exists (active or inactive)
          const existing = await query(
            `SELECT id FROM approver_assignments
             WHERE user_id = $1 AND approver_role = $2`,
            [userId, role]
          );

          if (existing.rows.length > 0) {
            // Update existing assignment
            await query(
              `UPDATE approver_assignments
               SET is_active = TRUE, department = $3
               WHERE user_id = $1 AND approver_role = $2`,
              [userId, role, department || null]
            );
          } else {
            // Insert new assignment
            await query(
              `INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
               VALUES ($1, $2, $3, TRUE)`,
              [userId, role, department || null]
            );
          }
        }

        await query('COMMIT');

        console.log('[POST approver-roles] Roles updated successfully');
        res.json({
          success: true,
          message: 'Approver roles updated successfully',
        });
      } catch (error) {
        console.error('[POST approver-roles] Transaction error:', error);
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('[POST approver-roles] Error:', error);
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
