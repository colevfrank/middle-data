const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { assignCell, generateAllOrderings } = require('../randomization');
const { checkAndRecord, getClientIp } = require('../ratelimit');
const { setSessionCookie } = require('../session');

const router = express.Router();

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/start', asyncHandler(async (req, res) => {
  const pid = req.query.PROLIFIC_PID;
  const studyId = req.query.STUDY_ID || null;
  const sessionId = req.query.SESSION_ID || null;
  const passthrough = [];
  if (req.query.mode === 'settings') passthrough.push('mode=settings');
  if (req.query.voice === 'appx') passthrough.push('voice=appx');
  const passthroughQs = passthrough.length ? '?' + passthrough.join('&') : '';

  if (!pid || typeof pid !== 'string' || pid.length < 4 || pid.length > 64 || !/^[A-Za-z0-9_-]+$/.test(pid)) {
    return res.status(400).send(renderError('Invalid or missing PROLIFIC_PID. Please return to Prolific and try again.'));
  }

  // Existing participant? Resume or block.
  const existing = await query('SELECT * FROM participants WHERE prolific_pid = $1', [pid]);
  if (existing.rowCount > 0) {
    const p = existing.rows[0];
    if (p.completed) {
      return res.status(200).send(renderInfo('You have already completed this study. Thank you.'));
    }
    if (p.current_screen === 'returned') {
      return res.redirect(returnUrl());
    }
    setSessionCookie(res, p.session_token);
    return res.redirect('/screen.html' + passthroughQs);
  }

  // Rate-limit only first-time IPs.
  const ip = getClientIp(req);
  const rl = checkAndRecord(ip);
  if (!rl.ok) {
    return res.status(429).send(renderError('Too many sessions started recently. Please return to Prolific and try again later.'));
  }

  const cell = await assignCell();
  const orderings = generateAllOrderings();
  const token = uuidv4();

  await query(
    `INSERT INTO participants (
        prolific_pid, study_id, session_id, session_token,
        data_type, use_case,
        scenario_order, post_question_order,
        current_screen
     ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,'consent'
     )`,
    [
      pid, studyId, sessionId, token,
      cell.data_type, cell.use_case,
      orderings.scenario_order,
      orderings.post_question_order
    ]
  );

  setSessionCookie(res, token);
  return res.redirect('/screen.html' + passthroughQs);
}));

function returnUrl() {
  return process.env.PROLIFIC_RETURN_URL || 'https://app.prolific.com/submissions/return';
}

function renderError(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Error</title>
<link rel="stylesheet" href="/styles.css"></head>
<body class="min-h-screen flex items-center justify-center bg-gray-50">
<div class="max-w-md p-8 bg-white rounded shadow text-center">
<p class="text-gray-800">${escapeHtml(msg)}</p>
</div></body></html>`;
}

function renderInfo(msg) {
  return renderError(msg);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

module.exports = router;
