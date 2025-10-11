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

    // Check if user already has an active session
    let sessionToken;
    const existingSession = await query(
      'SELECT session_token FROM user_sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW() ORDER BY last_activity DESC LIMIT 1',
      [user.id]
    );

    if (existingSession.rows.length > 0) {
      // Reuse existing session
      sessionToken = existingSession.rows[0].session_token;
      // Update last activity
      await query(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1',
        [sessionToken]
      );
    } else {
      // Create new session record
      sessionToken = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      await query(
        'INSERT INTO user_sessions (user_id, session_token, is_active, last_activity, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, sessionToken, true, new Date(), expiresAt]
      );
    }

    res.json({
      success: true,
      token,
      sessionToken,
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

// Logout (server-side session removal)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    
    if (sessionToken) {
      // Remove the specific session
      await query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND session_token = $2',
        [req.user.id, sessionToken]
      );
    } else {
      // Remove all sessions for the user (if no specific session token provided)
      await query(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Get session statistics (admin/manager only)
router.get('/sessions/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user has permission to view session stats
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Get active sessions (not expired and is_active = true)
    const activeSessionsResult = await query(
      'SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW() AND is_active = true'
    );

    // Get total sessions (including expired)
    const totalSessionsResult = await query(
      'SELECT COUNT(*) as count FROM user_sessions'
    );

    // Get sessions by user
    const sessionsByUserResult = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.is_active = true AND s.expires_at > NOW() THEN 1 END) as active_sessions,
        MAX(s.last_activity) as last_activity
      FROM users u 
      LEFT JOIN user_sessions s ON u.id = s.user_id
      GROUP BY u.id, u.name, u.email
      ORDER BY active_sessions DESC, total_sessions DESC
    `);

    res.json({
      success: true,
      data: {
        activeSessions: parseInt(activeSessionsResult.rows[0].count),
        totalSessions: parseInt(totalSessionsResult.rows[0].count),
        sessionsByUser: sessionsByUserResult.rows
      }
    });
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session statistics'
    });
  }
});

// Mark session as active (when tab becomes visible)
router.post('/sessions/active', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token required'
      });
    }

    // Update session to active and extend expiry
    const result = await query(
      'UPDATE user_sessions SET is_active = true, last_activity = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL \'24 hours\' WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    res.json({
      success: true,
      message: 'Session marked as active'
    });
  } catch (error) {
    console.error('Mark session active error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark session as active'
    });
  }
});

// Mark session as inactive (when tab is hidden)
router.post('/sessions/inactive', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token required'
      });
    }

    // Update session to inactive
    const result = await query(
      'UPDATE user_sessions SET is_active = false, last_activity = CURRENT_TIMESTAMP WHERE session_token = $1',
      [sessionToken]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session marked as inactive'
    });
  } catch (error) {
    console.error('Mark session inactive error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark session as inactive'
    });
  }
});

// Heartbeat to keep session alive
router.post('/sessions/heartbeat', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token required'
      });
    }

    // Update last activity and extend expiry if session is active
    const result = await query(
      'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL \'24 hours\' WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    res.json({
      success: true,
      message: 'Heartbeat received'
    });
  } catch (error) {
    console.error('Session heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process heartbeat'
    });
  }
});

// Close session (when tab is closed)
router.post('/sessions/close', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token required'
      });
    }

    // Delete the specific session
    const result = await query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );

    res.json({
      success: true,
      message: 'Session closed'
    });
  } catch (error) {
    console.error('Session close error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close session'
    });
  }
});

// Cleanup expired sessions
router.post('/sessions/cleanup', authenticateToken, async (req, res) => {
  try {
    // Only admins can trigger cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Clean up expired sessions
    const expiredResult = await query(
      'DELETE FROM user_sessions WHERE expires_at <= NOW()'
    );

    // Mark sessions as inactive if no heartbeat for 2 minutes
    const inactiveResult = await query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE last_activity < NOW() - INTERVAL '2 minutes' 
      AND is_active = true
    `);

    res.json({
      success: true,
      message: `Cleaned up ${expiredResult.rowCount} expired sessions and marked ${inactiveResult.rowCount} sessions as inactive`
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup sessions'
    });
  }
});

// Auto-cleanup function to mark sessions as inactive
const autoCleanupSessions = async () => {
  try {
    // Mark sessions as inactive if no heartbeat for 2 minutes
    const result = await query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE last_activity < NOW() - INTERVAL '2 minutes' 
      AND is_active = true
    `);
    
    if (result.rowCount > 0) {
      console.log(`Auto-cleanup: Marked ${result.rowCount} sessions as inactive`);
    }
  } catch (error) {
    console.error('Auto-cleanup error:', error);
  }
};

// Run auto-cleanup every minute
setInterval(autoCleanupSessions, 60000);

module.exports = router;
