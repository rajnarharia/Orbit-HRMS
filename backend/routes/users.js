// routes/users.js
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users - Admin: list all employees with today's status
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const users = store.listUsers().map((u) => ({
    ...store.sanitizeUser(u),
    todayStatus: store.getTodayStatusForUser(u.id)
  }));
  res.json({ users });
});

// GET /api/users/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: store.sanitizeUser(req.user) });
});

// PUT /api/users/me - employee edits limited fields on their own profile
router.put('/me', requireAuth, (req, res) => {
  const updated = store.updateUser(req.user.id, req.body, false);
  res.json({ user: store.sanitizeUser(updated) });
});

// GET /api/users/:id - admin can view anyone; employee can only view self
router.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'You can only view your own profile.' });
  }
  const user = store.findUserById(id);
  if (!user) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ user: store.sanitizeUser(user), todayStatus: store.getTodayStatusForUser(id) });
});

// PUT /api/users/:id - admin edits any employee's full profile
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const updated = store.updateUser(req.params.id, req.body, true);
  if (!updated) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ user: store.sanitizeUser(updated) });
});

// POST /api/users - Admin creates a new employee (auto-generated login ID + temp password)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, email, role, department, jobPosition, dateOfJoining } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (store.findUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const { user, passwordPlain } = store.createUser({
    ...req.body,
    role: role === 'admin' ? 'admin' : 'employee',
    mustChangePassword: true
  });
  res.status(201).json({
    user: store.sanitizeUser(user),
    temporaryPassword: passwordPlain,
    note: 'Share this temporary password with the employee. They will be required to change it on first login.'
  });
});

module.exports = router;
