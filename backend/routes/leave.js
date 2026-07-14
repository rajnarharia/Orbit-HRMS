// routes/leave.js
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const VALID_TYPES = ['Paid', 'Sick', 'Unpaid'];

// GET /api/leave/balance/me
router.get('/balance/me', requireAuth, (req, res) => {
  const balance = store.getLeaveBalance(req.user.id);
  res.json({ balance });
});

// GET /api/leave/balance/:id - admin
router.get('/balance/:id', requireAuth, requireAdmin, (req, res) => {
  const balance = store.getLeaveBalance(req.params.id);
  res.json({ balance });
});

// POST /api/leave - employee applies for leave
router.post('/', requireAuth, (req, res) => {
  const { leaveType, startDate, endDate, remarks, attachment } = req.body;
  if (!leaveType || !VALID_TYPES.includes(leaveType)) {
    return res.status(400).json({ error: 'Leave type must be Paid, Sick or Unpaid.' });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required.' });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'End date cannot be before start date.' });
  }
  const record = store.applyLeave(req.user.id, { leaveType, startDate, endDate, remarks, attachment });
  res.status(201).json({ leave: record });
});

// GET /api/leave/me
router.get('/me', requireAuth, (req, res) => {
  const leaves = store.listLeavesForUser(req.user.id);
  res.json({ leaves });
});

// GET /api/leave - admin views all leave requests
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const leaves = store.listAllLeaves();
  const users = store.listUsers();
  const enriched = leaves.map((l) => ({
    ...l,
    employeeName: users.find((u) => u.id === l.userId)?.name || 'Unknown'
  }));
  res.json({ leaves: enriched });
});

// PUT /api/leave/:id/status - admin approves or rejects
router.put('/:id/status', requireAuth, requireAdmin, (req, res) => {
  const { status, adminComment } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Approved, Rejected or Pending.' });
  }
  const result = store.setLeaveStatus(req.params.id, status, adminComment);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ leave: result.leave });
});

module.exports = router;
