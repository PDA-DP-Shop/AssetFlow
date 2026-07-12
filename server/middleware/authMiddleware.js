const jwt = require('jsonwebtoken');
const db  = require('../db/db');

/**
 * authMiddleware
 * Reads the Bearer token from Authorization header, verifies it,
 * fetches the user from the DB and attaches to req.user.
 * Returns 401 if missing/invalid, 403 if user no longer exists.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch from DB so role / dept changes are always fresh
    const result = await db.query(
      'SELECT id, name, email, role, department_id, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'User account no longer exists.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * requireRole(roles)
 * Middleware factory — call after authMiddleware.
 * Usage: router.get('/admin', authMiddleware, requireRole(['Admin']), handler)
 *
 * @param {string[]} roles - Allowed role strings e.g. ['Admin', 'AssetManager']
 */
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role(s): ${roles.join(', ')}.`,
    });
  }

  next();
};

module.exports = { authMiddleware, requireRole };
