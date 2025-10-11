const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const sessionToken = req.headers['x-session-token'];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const userResult = await query(
      'SELECT id, azure_id, email, name, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // If session token is provided, validate session
    if (sessionToken) {
      const sessionResult = await query(
        'SELECT id, expires_at FROM user_sessions WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()',
        [user.id, sessionToken]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Update session last activity (optional - for tracking)
      await query(
        'UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionResult.rows[0].id]
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user's role permissions
      const result = await query(
        'SELECT permissions FROM roles WHERE name = $1',
        [req.user.role]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Role not found' });
      }

      const permissions = result.rows[0].permissions;
      if (!permissions.includes(permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          current: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission
};
