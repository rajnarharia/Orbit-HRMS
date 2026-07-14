// routes/attendance.js
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/attendance/check-in
router.post('/check-in', requireAuth, (req, res) => {
  const result = store.checkIn(req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ record: result.record });
});

// POST /api/attendance/check-out
router.post('/check-out', requireAuth, (req, res) => {
  const result = store.checkOut(req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ record: result.record });
});

// GET /api/attendance/me?month=&year=
router.get('/me', requireAuth, (req, res) => {
  const { month, year } = req.query;
  const records = store.listAttendanceForUser(req.user.id, month, year);
  const today = store.getAttendanceForUserOnDate(req.user.id, store.todayStr());
  res.json({ records, today: today || null });
});

// GET /api/attendance/user/:id - admin views a specific employee's attendance
router.get('/user/:id', requireAuth, requireAdmin, (req, res) => {
  const { month, year } = req.query;
  const records = store.listAttendanceForUser(req.params.id, month, year);
  res.json({ records });
});

// GET /api/attendance?date=YYYY-MM-DD - admin views all employees for a date
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const date = req.query.date || store.todayStr();
  const records = store.listAttendanceForDate(date);
  const users = store.listUsers();
  const merged = users.map((u) => {
    const rec = records.find((r) => r.userId === u.id);
    return {
      userId: u.id,
      name: u.name,
      department: u.department,
      date,
      checkIn: rec ? rec.checkIn : null,
      checkOut: rec ? rec.checkOut : null,
      workHours: rec ? rec.workHours : 0,
      extraHours: rec ? rec.extraHours : 0,
      status: rec ? rec.status : store.getTodayStatusForUser(u.id)
    };
  });
  res.json({ date, records: merged });
});

module.exports = router;
