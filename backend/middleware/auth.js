// middleware/auth.js
const jwt = require('jsonwebtoken');
const { findUserById } = require('../db/store');

const JWT_SECRET = process.env.JWT_SECRET || 'hrms-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Session invalid. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required for this action.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
