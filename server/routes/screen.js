const express = require('express');
const { query } = require('../db');
const { authenticate, clearSessionCookie } = require('../session');
const { VALIDATORS } = require('../validation');
const { nextAfter } = require('../state');
const { screenPayload, progressFor } = require('../screenContent');
const { ATTENTION_CHECK_EXPECTED } = require('../content');

const router = express.Router();

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function returnUrl() {
  return process.env.PROLIFIC_RETURN_URL || 'https://app.prolific.com/submissions/return';
}

function completionUrl() {
  const code = process.env.PROLIFIC_COMPLETION_CODE || 'PLACEHOLDER';
  return `https://app.prolific.com/submissions/complete?cc=${encodeURIComponent(code)}`;
}

// GET /screen — returns the active screen content for the authenticated participant
router.get('/screen', authenticate, asyncHandler(async (req, res) => {
  const p = req.participant;

  if (p.current_screen === 'returned') {
    return res.json({ screen: 'returned', redirect: returnUrl() });
  }
  if (p.current_screen === 'complete' || p.completed) {
    return res.json({ screen: 'complete', redirect: completionUrl() });
  }

  const payload = screenPayload(p, p.current_screen);
  payload.progress = progressFor(p.current_screen, p);
  return res.json(payload);
}));

// POST /screen/:id — submit a screen
router.post('/screen/:id', authenticate, asyncHandler(async (req, res) => {
  const p = req.participant;
  const submittedScreen = req.params.id;

  if (p.current_screen !== submittedScreen) {
    return res.status(409).json({ error: 'screen_mismatch', expected: p.current_screen });
  }

  const validator = VALIDATORS[submittedScreen];
  if (!validator) {
    return res.status(400).json({ error: 'unknown_screen' });
  }

  let result;
  if (submittedScreen === 'comprehension') {
    result = validator(req.body, p.data_type, p.use_case);
  } else if (submittedScreen === 'attitudes') {
    result = validator(req.body, ATTENTION_CHECK_EXPECTED);
  } else {
    result = validator(req.body);
  }

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  // Determine next screen + special branches
  let nextScreen = nextAfter(p, submittedScreen);

  if (submittedScreen === 'consent' && !result.consented) {
    nextScreen = 'returned';
  }

  if (submittedScreen === 'comprehension') {
    if (!result.passed) {
      if (p.comp_check_retry) {
        // Already retried once → return URL
        nextScreen = 'returned';
      } else {
        // First failure → mark retry, send them back to scenario_intro
        result.fields.comp_check_retry = true;
        nextScreen = 'scenario_intro';
      }
    }
  }

  // Build dynamic UPDATE
  const setCols = [];
  const setVals = [];
  let i = 1;
  for (const [col, val] of Object.entries(result.fields)) {
    setCols.push(`${col} = $${i++}`);
    setVals.push(val);
  }
  setCols.push(`current_screen = $${i++}`);
  setVals.push(nextScreen);

  if (nextScreen === 'complete') {
    setCols.push(`completed = TRUE`);
    setCols.push(`completed_at = NOW()`);
  }

  setVals.push(p.id);
  await query(
    `UPDATE participants SET ${setCols.join(', ')} WHERE id = $${i}`,
    setVals
  );

  // Insert event row
  const { timestamp_shown, timestamp_submitted, input_events } = req.body || {};
  let latencyMs = null;
  let shownDate = null;
  let submittedDate = null;
  if (typeof timestamp_shown === 'number' && typeof timestamp_submitted === 'number') {
    shownDate = new Date(timestamp_shown);
    submittedDate = new Date(timestamp_submitted);
    latencyMs = timestamp_submitted - timestamp_shown;
  }
  await query(
    `INSERT INTO events (participant_id, screen_id, timestamp_shown, timestamp_submitted, latency_ms, input_events)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [p.id, submittedScreen, shownDate, submittedDate || new Date(), latencyMs, input_events ? JSON.stringify(input_events) : null]
  );

  // Build response
  if (nextScreen === 'returned') {
    clearSessionCookie(res);
    return res.json({ redirect: returnUrl() });
  }
  if (nextScreen === 'complete') {
    clearSessionCookie(res);
    return res.json({ redirect: completionUrl() });
  }

  // Fetch the freshly updated participant for content rendering
  const refreshed = await query('SELECT * FROM participants WHERE id = $1', [p.id]);
  const np = refreshed.rows[0];

  const extra = {};
  if (nextScreen === 'scenario_intro' && submittedScreen === 'comprehension' && !result.passed) {
    extra.retry = true;
  }
  const payload = screenPayload(np, nextScreen, extra);
  payload.progress = progressFor(nextScreen, np);
  return res.json(payload);
}));

module.exports = router;
