const express  = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const db        = require('../db/db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── helpers ──────────────────────────────────────────────────────────────────

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const safeUser = (user) => ({
  id:            user.id,
  name:          user.name,
  email:         user.email,
  role:          user.role,
  department_id: user.department_id,
  created_at:    user.created_at,
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Creates an Employee-role account only.
// Role is hardcoded server-side — clients cannot choose a different role.
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Check duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'Employee')
       RETURNING id, name, email, role, department_id, created_at`,
      [name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user  = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[signup]', err.message);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const result = await db.query(
      `SELECT id, name, email, password_hash, role, department_id, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      // Generic message — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Stub — always returns success so email enumeration is not possible.
// Wire up a real email provider (SendGrid, Resend, etc.) here later.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required.' });
  }

  // TODO: generate a reset token, store it, and email the user a reset link.
  // For now we return success unconditionally to prevent email enumeration.
  return res.status(200).json({
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Validates the JWT from Authorization header and returns current user + role.
router.get('/me', authMiddleware, (req, res) => {
  return res.status(200).json({ user: safeUser(req.user) });
});

module.exports = router;
