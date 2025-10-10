const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Office365 authentication endpoint
router.post('/office365', [
  body('accessToken').notEmpty().withMessage('Access token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { accessToken } = req.body;

    // Verify token with Microsoft Graph API
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const userData = graphResponse.data;
    
    // Check if user exists in database
    let userResult = await query(
      'SELECT id, azure_id, email, name, role, status FROM users WHERE azure_id = $1',
      [userData.id]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await query(
        'INSERT INTO users (azure_id, email, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, azure_id, email, name, role, status',
        [userData.id, userData.mail || userData.userPrincipalName, userData.displayName, 'basicuser', 'active']
      );
      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
      
      // Update user info if needed
      if (user.email !== (userData.mail || userData.userPrincipalName) || 
          user.name !== userData.displayName) {
        await query(
          'UPDATE users SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [userData.mail || userData.userPrincipalName, userData.displayName, user.id]
        );
        user.email = userData.mail || userData.userPrincipalName;
        user.name = userData.displayName;
      }
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact an administrator.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Office365 authentication error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Office365 token'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
