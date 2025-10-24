const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * DEVELOPMENT ONLY - Simple login bypass
 * DO NOT USE IN PRODUCTION
 */

/**
 * @route   POST /api/dev-auth/login
 * @desc    Development login - bypasses Azure authentication
 * @access  Public (DEVELOPMENT ONLY)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required',
      });
    }

    // Check if user exists
    let userResult = await query('SELECT * FROM users WHERE email = $1', [email]);

    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      const insertResult = await query(
        `INSERT INTO users (azure_id, email, name, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [`dev-${Date.now()}`, email, name, 'basicuser', 'active']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate session token
    const sessionToken = require('crypto').randomBytes(32).toString('hex');

    // Create session
    await query(
      `INSERT INTO user_sessions (user_id, session_token, is_active, expires_at)
       VALUES ($1, $2, TRUE, NOW() + INTERVAL '24 hours')`,
      [user.id, sessionToken]
    );

    res.json({
      success: true,
      token,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Dev login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

module.exports = router;
