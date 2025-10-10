const express = require('express');
const { body, validationResult, query: queryValidator } = require('express-validator');
const { query } = require('../config/database');
const { requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/manager only)
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereClause += ` AND role = $${paramCount}`;
      params.push(role);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Get users
    paramCount++;
    const usersResult = await query(
      `SELECT id, azure_id, email, name, role, status, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get user by ID
router.get('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, azure_id, email, name, role, status, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Create user (admin only)
router.post('/', [
  requireRole(['admin']),
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('role').isIn(['basicuser', 'admin', 'manager']).withMessage('Invalid role'),
  body('azure_id').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, name, role = 'basicuser', azure_id } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user
    const result = await query(
      'INSERT INTO users (azure_id, email, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, azure_id, email, name, role, status, created_at',
      [azure_id || null, email, name, role, 'active']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Update user (admin only)
router.put('/:id', [
  requireRole(['admin']),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('role').optional().isIn(['basicuser', 'admin', 'manager']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { email, name, role, status } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check email uniqueness if email is being updated
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email);
    }

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (role) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      params.push(role);
    }

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    params.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, azure_id, email, name, role, status, created_at, updated_at`,
      params
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Deactivate user (admin only)
router.patch('/:id/deactivate', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, status',
      ['inactive', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user'
    });
  }
});

// Reactivate user (admin only)
router.patch('/:id/reactivate', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, status',
      ['active', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User reactivated successfully'
    });

  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;
