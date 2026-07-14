// routes/salary.js
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/salary/me - employee: read-only payroll view
router.get('/me', requireAuth, (req, res) => {
  const salary = store.getSalary(req.user.id);
  if (!salary) return res.status(404).json({ error: 'Salary record not found.' });
  res.json({ breakdown: store.computeSalaryBreakdown(salary) });
});

// GET /api/salary/:id - admin views any employee's payroll
router.get('/:id', requireAuth, requireAdmin, (req, res) => {
  const salary = store.getSalary(req.params.id);
  if (!salary) return res.status(404).json({ error: 'Salary record not found.' });
  res.json({ breakdown: store.computeSalaryBreakdown(salary), raw: salary });
});

// PUT /api/salary/:id - admin updates salary structure
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const salary = store.updateSalary(req.params.id, req.body);
  res.json({ breakdown: store.computeSalaryBreakdown(salary), raw: salary });
});

module.exports = router;
