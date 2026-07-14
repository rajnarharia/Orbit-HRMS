// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const store = require('../db/store');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/; // >=6 chars, at least one letter & one digit

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup
// Public self-registration, per functional requirement 3.1.1.
router.post('/signup', (req, res) => {
  const { name, email, password, role, employeeCode } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (!PASSWORD_RULE.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters and include at least one letter and one number.'
    });
  }
  if (store.findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  if (employeeCode && store.findUserByCode(employeeCode)) {
    return res.status(409).json({ error: 'This Employee ID is already in use.' });
  }

  const { user } = store.createUser({
    name,
    email,
    password,
    role: role === 'admin' || role === 'HR' ? 'admin' : 'employee',
    employeeCode
  });

  const token = signToken(user);
  res.status(201).json({ token, user: store.sanitizeUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Employee ID and password are required.' });
  }

  const user = store.findUserByEmail(identifier) || store.findUserByCode(identifier);
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email/ID or password.' });
  }
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email/ID or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: store.sanitizeUser(user) });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || !PASSWORD_RULE.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 6 characters and include at least one letter and one number.'
    });
  }
  const valid = bcrypt.compareSync(currentPassword || '', req.user.passwordHash);
  if (!req.user.mustChangePassword && !valid) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  store.setPassword(req.user.id, newPassword);
  res.json({ message: 'Password updated successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: store.sanitizeUser(req.user) });
});

module.exports = router;
