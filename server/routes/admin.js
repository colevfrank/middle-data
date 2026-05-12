const express = require('express');
const { query } = require('../db');

const router = express.Router();

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function basicAuth(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return res.status(503).send('Admin not configured');

  const header = req.get('authorization') || '';
  const expected = 'Basic ' + Buffer.from('admin:' + password).toString('base64');
  if (header !== expected) {
    res.set('WWW-Authenticate', 'Basic realm="admin"');
    return res.status(401).send('Auth required');
  }
  next();
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return '"' + v.join('|') + '"';
  if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

router.get('/admin/export.csv', basicAuth, asyncHandler(async (req, res) => {
  const { rows, fields } = await query('SELECT * FROM participants ORDER BY id');
  const cols = fields.map(f => f.name);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="participants.csv"');
  res.write(cols.join(',') + '\n');
  for (const r of rows) {
    res.write(cols.map(c => csvCell(r[c])).join(',') + '\n');
  }
  res.end();
}));

router.get('/admin/events.csv', basicAuth, asyncHandler(async (req, res) => {
  const { rows, fields } = await query('SELECT * FROM events ORDER BY id');
  const cols = fields.map(f => f.name);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
  res.write(cols.join(',') + '\n');
  for (const r of rows) {
    res.write(cols.map(c => csvCell(r[c])).join(',') + '\n');
  }
  res.end();
}));

router.get('/admin/stats', basicAuth, asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT data_type, use_case, COUNT(*)::int AS started,
           SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completed
      FROM participants
     GROUP BY data_type, use_case
     ORDER BY data_type, use_case
  `);
  res.json({ cells: rows });
}));

module.exports = router;
