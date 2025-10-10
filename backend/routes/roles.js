const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all roles (admin only)
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, description, permissions, created_at FROM roles ORDER BY name'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

// Get role by ID (admin only)
router.get('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, name, description, permissions, created_at FROM roles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role'
    });
  }
});

// Create role (admin only)
router.post('/', [
  requireRole(['admin']),
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').optional().isString(),
  body('permissions').isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description = '', permissions = [] } = req.body;

    // Check if role already exists
    const existingRole = await query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Role with this name already exists'
      });
    }

    // Create role
    const result = await query(
      'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING id, name, description, permissions, created_at',
      [name, description, JSON.stringify(permissions)]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role'
    });
  }
});

// Update role (admin only)
router.put('/:id', [
  requireRole(['admin']),
  body('name').optional().notEmpty().withMessage('Role name cannot be empty'),
  body('description').optional().isString(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
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
    const { name, description, permissions } = req.body;

    // Check if role exists
    const existingRole = await query(
      'SELECT id FROM roles WHERE id = $1',
      [id]
    );

    if (existingRole.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    // Check name uniqueness if name is being updated
    if (name) {
      const nameCheck = await query(
        'SELECT id FROM roles WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Role name already exists'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (permissions) {
      paramCount++;
      updates.push(`permissions = $${paramCount}`);
      params.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    paramCount++;
    params.push(id);

    const result = await query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, description, permissions, created_at`,
      params
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role'
    });
  }
});

// Delete role (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const existingRole = await query(
      'SELECT id, name FROM roles WHERE id = $1',
      [id]
    );

    if (existingRole.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    // Check if role is being used by any users
    const usersWithRole = await query(
      'SELECT COUNT(*) FROM users WHERE role = $1',
      [existingRole.rows[0].name]
    );

    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete role that is assigned to users'
      });
    }

    // Delete role
    await query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
});

module.exports = router;
