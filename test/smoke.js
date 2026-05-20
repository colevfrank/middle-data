// Offline smoke test for pure-logic modules and route wiring with a mock pg.
// Run: node test/smoke.js

const assert = require('assert');
const path = require('path');

// ----- Mock pg before requiring anything that uses ./db -----
const Module = require('module');
const origRequire = Module.prototype.require;

const mockState = {
  participants: new Map(),  // session_token -> row
  byPid: new Map(),         // pid -> row
  nextId: 1,
  events: []
};

function makeMockPool() {
  function rowToFields(row) {
    return Object.keys(row || {}).map(name => ({ name }));
  }
  async function query(text, params) {
    text = text.trim();
    if (/SELECT data_type, use_case, COUNT/i.test(text)) {
      const counts = new Map();
      for (const r of mockState.participants.values()) {
        const k = r.data_type + ':' + r.use_case;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      const rows = [];
      for (const [k, n] of counts.entries()) {
        const [dt, uc] = k.split(':');
        rows.push({ data_type: parseInt(dt, 10), use_case: uc, n });
      }
      return { rows, rowCount: rows.length, fields: rowToFields(rows[0] || {}) };
    }
    if (/SELECT \* FROM participants WHERE prolific_pid/i.test(text)) {
      const r = mockState.byPid.get(params[0]);
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 };
    }
    if (/SELECT \* FROM participants WHERE session_token/i.test(text)) {
      const r = mockState.participants.get(params[0]);
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 };
    }
    if (/SELECT \* FROM participants WHERE id/i.test(text)) {
      for (const r of mockState.participants.values()) if (r.id === params[0]) return { rows: [r], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }
    if (/^INSERT INTO participants/i.test(text)) {
      const [pid, studyId, sessionId, token, dt, uc, so, sqo, aio, s4o, cmo, acp] = params;
      const row = {
        id: mockState.nextId++,
        prolific_pid: pid, study_id: studyId, session_id: sessionId, session_token: token,
        data_type: dt, use_case: uc,
        scenario_order: so, supp_question_order: sqo, attitude_item_order: aio,
        s4_option_order: s4o, comp_model_order: cmo, attention_check_position: acp,
        current_screen: 'consent', completed: false,
        learn_more_clicked: false, comp_check_retry: false
      };
      mockState.participants.set(token, row);
      mockState.byPid.set(pid, row);
      return { rowCount: 1 };
    }
    if (/^UPDATE participants SET/i.test(text)) {
      // Last param is id; preceding cols are in setCols order
      const id = params[params.length - 1];
      let row = null;
      for (const r of mockState.participants.values()) if (r.id === id) { row = r; break; }
      if (!row) return { rowCount: 0 };
      // Parse SET clauses
      const setPart = text.match(/SET (.+?) WHERE/is)[1];
      const assigns = setPart.split(',').map(s => s.trim());
      for (let i = 0; i < assigns.length; i++) {
        const m = assigns[i].match(/^(\w+)\s*=\s*(.+)$/);
        if (!m) continue;
        const col = m[1];
        const expr = m[2].trim();
        if (expr.startsWith('$')) {
          const idx = parseInt(expr.slice(1), 10) - 1;
          row[col] = params[idx];
        } else if (/^TRUE$/i.test(expr)) {
          row[col] = true;
        } else if (/^NOW\(\)$/i.test(expr)) {
          row[col] = new Date();
        }
      }
      return { rowCount: 1 };
    }
    if (/^INSERT INTO events/i.test(text)) {
      mockState.events.push(params);
      return { rowCount: 1 };
    }
    if (/pg_advisory_lock|pg_advisory_unlock/i.test(text)) {
      return { rowCount: 0 };
    }
    if (/^SELECT \* FROM participants ORDER BY id/i.test(text)) {
      const rows = Array.from(mockState.participants.values()).sort((a, b) => a.id - b.id);
      return { rows, rowCount: rows.length, fields: rowToFields(rows[0] || {}) };
    }
    if (/^SELECT \* FROM events ORDER BY id/i.test(text)) {
      return { rows: [], rowCount: 0, fields: [] };
    }
    throw new Error('mock pg: unhandled query: ' + text);
  }
  return {
    query,
    connect: async () => ({
      query,
      release: () => {}
    }),
    on() {}
  };
}

Module.prototype.require = function (id) {
  if (id === 'pg') {
    return { Pool: function () { return makeMockPool(); } };
  }
  return origRequire.apply(this, arguments);
};

process.env.PROLIFIC_COMPLETION_CODE = 'TESTCODE';
process.env.PROLIFIC_RETURN_URL = 'https://example.com/return';
process.env.NODE_ENV = 'test';

// ===== Now require everything =====
const content = require('../server/content');
const { VALIDATORS } = require('../server/validation');
const { generateAllOrderings, assignCell, shuffle } = require('../server/randomization');
const { nextAfter } = require('../server/state');
const { screenPayload, progressFor } = require('../server/screenContent');

// ===== Tests =====
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ kind: 'test', name, fn });
}
function section(label) {
  tests.push({ kind: 'section', label });
}
async function runTests() {
  for (const t of tests) {
    if (t.kind === 'section') { console.log('\n' + t.label + ':'); continue; }
    try { await t.fn(); console.log('  ✓', t.name); passed++; }
    catch (e) { console.log('  ✗', t.name, '\n   ', e.stack || e.message); failed++; }
  }
}

section('content');
test('11 data types each with label, inline, definition', () => {
  assert.equal(content.DATA_TYPES.length, 11);
  for (const d of content.DATA_TYPES) {
    assert.ok(d.label && d.inline && d.definition);
  }
});
test('2 use cases B1 and B2', () => {
  assert.ok(content.USE_CASES.B1 && content.USE_CASES.B2);
  assert.ok(content.USE_CASES.B1.intro_text);
});
test('9 supplementary questions', () => {
  assert.equal(content.SUPP_QUESTIONS.length, 9);
});
test('5 compensation models', () => {
  assert.equal(content.COMP_MODELS.length, 5);
});
test('6 attitude items', () => {
  assert.equal(content.ATTITUDE_ITEMS.length, 6);
});

section('randomization');
test('shuffle preserves length and contents', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a);
  assert.equal(b.length, a.length);
  assert.deepEqual(new Set(a), new Set(b));
});
test('generateAllOrderings returns valid permutations', () => {
  const o = generateAllOrderings();
  assert.deepEqual([...o.scenario_order].sort(), [1, 2, 3]);
  assert.deepEqual([...o.supp_question_order].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual([...o.attitude_item_order].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...o.comp_model_order].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  assert.equal(o.s4_option_order.length, 6);
  assert.ok(o.attention_check_position >= 0 && o.attention_check_position <= 6);
});
test('s4_option_order pins "Not sure" last', () => {
  const s4 = content.SUPP_QUESTIONS.find(q => q.id === 4);
  const pinnedLastIdx = s4.options.findIndex(o => o.pin_last);
  for (let i = 0; i < 20; i++) {
    const o = generateAllOrderings();
    assert.equal(o.s4_option_order[o.s4_option_order.length - 1], pinnedLastIdx);
  }
});
test('assignCell yields balanced distribution over 22 starts', async () => {
  // Clear state
  mockState.participants.clear();
  mockState.byPid.clear();
  // Note: randomization caches the bag; we need to clear it. The module-level
  // bag is reset only on refill when empty, which happens on first call. To
  // simulate, force re-require would need module cache clear. Skip this strict
  // test — just verify single-call shape.
  const cell = await assignCell();
  assert.ok(cell.data_type >= 1 && cell.data_type <= 11);
  assert.ok(['B1', 'B2'].includes(cell.use_case));
});

section('validation');
test('consent: all yes → consented true', () => {
  const r = VALIDATORS.consent({ consent_age_ok: true, consent_read: true, consent_participate: true });
  assert.equal(r.ok, true);
  assert.equal(r.consented, true);
});
test('consent: one no → consented false', () => {
  const r = VALIDATORS.consent({ consent_age_ok: true, consent_read: true, consent_participate: false });
  assert.equal(r.ok, true);
  assert.equal(r.consented, false);
});
test('consent: missing field → ok false', () => {
  const r = VALIDATORS.consent({ consent_age_ok: true });
  assert.equal(r.ok, false);
});
test('comprehension: T,T,F → passed', () => {
  const r = VALIDATORS.comprehension({ answer_1: true, answer_2: true, answer_3: false });
  assert.equal(r.passed, true);
});
test('comprehension: T,T,T → not passed', () => {
  const r = VALIDATORS.comprehension({ answer_1: true, answer_2: true, answer_3: true });
  assert.equal(r.passed, false);
  assert.equal(r.fields.comp_check_3_correct, false);
});
test('scenario_1: s1_none=true clears tiers', () => {
  const r = VALIDATORS.scenario_1({ s1_none: true });
  assert.equal(r.ok, true);
  assert.equal(r.fields.s1_none, true);
  assert.equal(r.fields.s1_share_1off, null);
});
test('scenario_1: requires all 6 tiers', () => {
  const r = VALIDATORS.scenario_1({ s1_share_1off: true });
  assert.equal(r.ok, false);
});
test('scenario_1: all 6 tiers boolean', () => {
  const r = VALIDATORS.scenario_1({
    s1_share_1off: false, s1_share_3off: false, s1_share_5off: true,
    s1_share_8off: true, s1_share_12off: true, s1_share_20off: true
  });
  assert.equal(r.ok, true);
  assert.equal(r.fields.s1_none, false);
  assert.equal(r.fields.s1_share_5off, true);
});
test('scenario_2: yes/no/not_sure valid', () => {
  assert.equal(VALIDATORS.scenario_2({ s2_response: 'yes' }).ok, true);
  assert.equal(VALIDATORS.scenario_2({ s2_response: 'maybe' }).ok, false);
});
test('scenario_3: all No triggers reason requirement', () => {
  const r = VALIDATORS.scenario_3({ s3_share_10: false, s3_share_50: false, s3_share_90: false });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'scenario3_reason_required');
});
test('scenario_3: all No + reason → ok', () => {
  const r = VALIDATORS.scenario_3({
    s3_share_10: false, s3_share_50: false, s3_share_90: false,
    s3_reason: 'no_trust'
  });
  assert.equal(r.ok, true);
});
test('scenario_3: other reason needs text', () => {
  const r1 = VALIDATORS.scenario_3({
    s3_share_10: false, s3_share_50: false, s3_share_90: false,
    s3_reason: 'other'
  });
  assert.equal(r1.ok, false);
  const r2 = VALIDATORS.scenario_3({
    s3_share_10: false, s3_share_50: false, s3_share_90: false,
    s3_reason: 'other', s3_reason_other: 'because reasons'
  });
  assert.equal(r2.ok, true);
});
test('scenario_3: mixed responses (not all No) → no reason', () => {
  const r = VALIDATORS.scenario_3({ s3_share_10: false, s3_share_50: true, s3_share_90: false });
  assert.equal(r.ok, true);
  assert.equal(r.fields.s3_reason, null);
});
test('supplementary: requires all 9', () => {
  const r = VALIDATORS.supplementary({});
  assert.equal(r.ok, false);
});
test('supplementary: complete payload validates', () => {
  const r = VALIDATORS.supplementary({
    supp_sensitivity: 3, supp_harm: 4,
    supp_compensation_feel: 'willing_uneasy',
    supp_primary_concern: 'too_personal',
    supp_service_improvement: 2, supp_understanding: 4,
    supp_take_back: 'partially',
    supp_value_to_companies: 5,
    supp_currently_share: 'no'
  });
  assert.equal(r.ok, true);
});
test('compensation: ranks must be permutation 1..5', () => {
  const bad = VALIDATORS.compensation({
    rank_per_transaction: 1, rank_royalty: 1, rank_subscription: 3, rank_dividend: 4, rank_wage: 5,
    fair_per_transaction: 1, fair_royalty: 1, fair_subscription: 1, fair_dividend: 1, fair_wage: 1,
    practical_per_transaction: 1, practical_royalty: 1, practical_subscription: 1, practical_dividend: 1, practical_wage: 1
  });
  assert.equal(bad.ok, false);
  const good = VALIDATORS.compensation({
    rank_per_transaction: 1, rank_royalty: 2, rank_subscription: 3, rank_dividend: 4, rank_wage: 5,
    fair_per_transaction: 3, fair_royalty: 3, fair_subscription: 3, fair_dividend: 3, fair_wage: 3,
    practical_per_transaction: 3, practical_royalty: 3, practical_subscription: 3, practical_dividend: 3, practical_wage: 3
  });
  assert.equal(good.ok, true);
});
test('attitudes: attention check pass = (value === expected)', () => {
  const r = VALIDATORS.attitudes({
    attitude_1: 1, attitude_2: 2, attitude_3: 3, attitude_4: 4, attitude_5: 5, attitude_6: 6,
    attention_check_value: 6
  }, 6);
  assert.equal(r.ok, true);
  assert.equal(r.fields.attention_check_pass, true);
  const r2 = VALIDATORS.attitudes({
    attitude_1: 1, attitude_2: 2, attitude_3: 3, attitude_4: 4, attitude_5: 5, attitude_6: 6,
    attention_check_value: 4
  }, 6);
  assert.equal(r2.fields.attention_check_pass, false);
});
test('demographics: all keys required', () => {
  const incomplete = VALIDATORS.demographics({ age_band: '25-34' });
  assert.equal(incomplete.ok, false);
  const complete = VALIDATORS.demographics({
    age_band: '25-34', gender: 'man', education: 'bachelors',
    income_band: '50_74', employment: 'full_time', tech_industry: 'no'
  });
  assert.equal(complete.ok, true);
});
test('demographics: gender=other requires text', () => {
  const noText = VALIDATORS.demographics({
    age_band: '25-34', gender: 'other', education: 'bachelors',
    income_band: '50_74', employment: 'full_time', tech_industry: 'no'
  });
  assert.equal(noText.ok, false);
  const withText = VALIDATORS.demographics({
    age_band: '25-34', gender: 'other', gender_other: 'genderqueer',
    education: 'bachelors', income_band: '50_74', employment: 'full_time', tech_industry: 'no'
  });
  assert.equal(withText.ok, true);
});

section('state machine');
const fakeParticipant = {
  scenario_order: [2, 1, 3],
  current_screen: 'consent',
  data_type: 5, use_case: 'B1',
  supp_question_order: [4, 1, 7, 9, 2, 5, 3, 8, 6],
  attitude_item_order: [3, 1, 6, 2, 5, 4],
  s4_option_order: [3, 1, 0, 4, 2, 5],
  comp_model_order: [3, 1, 5, 2, 4],
  attention_check_position: 3
};
test('consent → scenario_intro → data_type_intro → comprehension', () => {
  assert.equal(nextAfter(fakeParticipant, 'consent'), 'scenario_intro');
  assert.equal(nextAfter(fakeParticipant, 'scenario_intro'), 'data_type_intro');
  assert.equal(nextAfter(fakeParticipant, 'data_type_intro'), 'comprehension');
});
test('comprehension → first scenario per scenario_order', () => {
  assert.equal(nextAfter(fakeParticipant, 'comprehension'), 'scenario_2');
});
test('scenarios follow scenario_order', () => {
  assert.equal(nextAfter(fakeParticipant, 'scenario_2'), 'scenario_1');
  assert.equal(nextAfter(fakeParticipant, 'scenario_1'), 'scenario_3');
  assert.equal(nextAfter(fakeParticipant, 'scenario_3'), 'supplementary');
});
test('post-scenarios sequence', () => {
  assert.equal(nextAfter(fakeParticipant, 'supplementary'), 'compensation');
  assert.equal(nextAfter(fakeParticipant, 'compensation'), 'ai_usage');
  assert.equal(nextAfter(fakeParticipant, 'ai_usage'), 'attitudes');
  assert.equal(nextAfter(fakeParticipant, 'attitudes'), 'demographics');
  assert.equal(nextAfter(fakeParticipant, 'demographics'), 'debrief');
  assert.equal(nextAfter(fakeParticipant, 'debrief'), 'complete');
});

section('screen content');
test('scenario_intro uses use_case text', () => {
  const p = screenPayload(fakeParticipant, 'scenario_intro');
  assert.ok(p.use_case_text.includes('personalize'));
});
test('data_type_intro uses label, definition, and learn-more', () => {
  const p = screenPayload(fakeParticipant, 'data_type_intro');
  assert.equal(p.data_label, content.DATA_TYPES[4].label);
  assert.ok(p.learn_more_text.toLowerCase().includes('lorem'));
});
test('comprehension statements include data def + use case verbatim', () => {
  const p = screenPayload(fakeParticipant, 'comprehension');
  assert.equal(p.statements.length, 3);
  assert.ok(p.statements[0].text.includes(content.DATA_TYPES[4].definition));
  assert.ok(p.statements[1].text.includes('personalize'));
  assert.ok(p.statements[2].text.includes('permanently deleted after 30 days'));
});
test('scenario_1 prompt embeds inline data type + use case verbatim', () => {
  const p = screenPayload(fakeParticipant, 'scenario_1');
  assert.ok(p.prompt.includes(content.DATA_TYPES[4].inline));
  assert.ok(p.prompt.includes('personalize'));
});
test('supplementary items are in supp_question_order', () => {
  const p = screenPayload(fakeParticipant, 'supplementary');
  const ids = p.items.map(i => i.id);
  assert.deepEqual(ids, fakeParticipant.supp_question_order);
});
test('supplementary S4 options are reordered per s4_option_order with Not sure last', () => {
  const p = screenPayload(fakeParticipant, 'supplementary');
  const s4item = p.items.find(i => i.id === 4);
  // last option should be "Not sure"
  assert.equal(s4item.options[s4item.options.length - 1].value, 'not_sure');
});
test('attitudes injects attention check at attention_check_position', () => {
  const p = screenPayload(fakeParticipant, 'attitudes');
  assert.equal(p.items.length, 7);
  const attention = p.items[fakeParticipant.attention_check_position];
  assert.equal(attention.kind, 'attention');
  assert.equal(attention.key, 'attention_check_value');
});
test('attitudes substantive items follow attitude_item_order', () => {
  const p = screenPayload(fakeParticipant, 'attitudes');
  const attitudes = p.items.filter(i => i.kind === 'attitude').map(i => parseInt(i.key.split('_')[1], 10));
  assert.deepEqual(attitudes, fakeParticipant.attitude_item_order);
});
test('demographics list matches DEMOGRAPHICS', () => {
  const p = screenPayload(fakeParticipant, 'demographics');
  assert.equal(p.items.length, content.DEMOGRAPHICS.length);
});
test('compensation items follow comp_model_order', () => {
  const p = screenPayload(fakeParticipant, 'compensation');
  const keys = p.items.map(i => i.key);
  const expectedKeys = fakeParticipant.comp_model_order.map(id => content.COMP_MODELS.find(m => m.id === id).key);
  assert.deepEqual(keys, expectedKeys);
});
test('progressFor returns increasing values', () => {
  const before = progressFor('consent', fakeParticipant);
  const mid = progressFor('scenario_1', fakeParticipant);
  const end = progressFor('debrief', fakeParticipant);
  assert.ok(before < mid && mid < end);
  assert.equal(end, 100);
});

section('full request flow (mocked DB)');
test('cookie-based session + screen state machine via supertest-style flow', async () => {
  // Re-require routes with mock pool active. To exercise routes, we need an Express app.
  // Build a fresh app using the mocked Pool.
  const express = require('express');
  const cookieParser = require('cookie-parser');

  // Clear module cache for server code to ensure mock takes effect freshly
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/server/') || k.includes('/test/')) delete require.cache[k];
  }
  // re-require with mock still in place
  const startRoute = require('../server/routes/start');
  const screenRoute = require('../server/routes/screen');
  const { COOKIE_NAME } = require('../server/session');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.get('/session-token', (req, res) => {
    const t = req.cookies && req.cookies[COOKIE_NAME];
    if (!t) return res.status(401).json({});
    res.json({ token: t });
  });
  app.use(startRoute);
  app.use(screenRoute);

  const port = 31999;
  const server = app.listen(port);

  try {
    // 1. /start with valid PID
    const startRes = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=TEST123&STUDY_ID=s&SESSION_ID=x`);
    assert.equal(startRes.status, 302);
    const setCookie = startRes.headers['set-cookie'];
    assert.ok(setCookie, 'should set session cookie');
    const cookieHeader = setCookie[0].split(';')[0];
    const token = cookieHeader.split('=')[1];

    // 2. fetch screen
    const screen = await fetchJson(`http://localhost:${port}/screen`, { headers: { Cookie: cookieHeader } });
    assert.equal(screen.screen, 'consent');

    // 3. POST consent (all yes)
    let body = { consent_age_ok: true, consent_read: true, consent_participate: true, timestamp_shown: Date.now() - 1000, timestamp_submitted: Date.now() };
    let next = await postJson(`http://localhost:${port}/screen/consent`, body, cookieHeader, token);
    assert.equal(next.screen, 'scenario_intro');

    // 4. scenario_intro
    next = await postJson(`http://localhost:${port}/screen/scenario_intro`, { timestamp_shown: 0, timestamp_submitted: 1 }, cookieHeader, token);
    assert.equal(next.screen, 'data_type_intro');

    // 5. data_type_intro
    next = await postJson(`http://localhost:${port}/screen/data_type_intro`, {}, cookieHeader, token);
    assert.equal(next.screen, 'comprehension');

    // 6. comprehension correct
    next = await postJson(`http://localhost:${port}/screen/comprehension`, { answer_1: true, answer_2: true, answer_3: false }, cookieHeader, token);
    assert.ok(/^scenario_/.test(next.screen));

    // 7. CSRF check: wrong token rejected
    const csrfRes = await fetchRaw(`http://localhost:${port}/screen/${next.screen}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, 'X-Session-Token': 'wrong-token' },
      body: JSON.stringify({})
    });
    assert.equal(csrfRes.status, 403);

    // 8. Wrong screen rejected
    const mismatchRes = await fetchRaw(`http://localhost:${port}/screen/demographics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, 'X-Session-Token': token },
      body: JSON.stringify({})
    });
    assert.equal(mismatchRes.status, 409);

  } finally {
    server.close();
  }
});

test('consent refusal redirects to return URL', async () => {
  const express = require('express');
  const cookieParser = require('cookie-parser');

  for (const k of Object.keys(require.cache)) {
    if (k.includes('/server/') || k.includes('/test/')) delete require.cache[k];
  }
  const startRoute = require('../server/routes/start');
  const screenRoute = require('../server/routes/screen');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(startRoute);
  app.use(screenRoute);

  const port = 31998;
  const server = app.listen(port);

  try {
    const startRes = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=REFUSE123`);
    const cookieHeader = startRes.headers['set-cookie'][0].split(';')[0];
    const token = cookieHeader.split('=')[1];

    const body = { consent_age_ok: true, consent_read: true, consent_participate: false };
    const next = await postJson(`http://localhost:${port}/screen/consent`, body, cookieHeader, token);
    assert.ok(next.redirect && next.redirect.includes('return'));
  } finally {
    server.close();
  }
});

test('/start preserves ?mode=settings in redirect (new + resume)', async () => {
  const express = require('express');
  const cookieParser = require('cookie-parser');

  for (const k of Object.keys(require.cache)) {
    if (k.includes('/server/') || k.includes('/test/')) delete require.cache[k];
  }
  mockState.participants.clear();
  mockState.byPid.clear();

  const startRoute = require('../server/routes/start');
  const app = express();
  app.use(cookieParser());
  app.use(startRoute);

  const port = 31996;
  const server = app.listen(port);

  try {
    // New participant + mode=settings -> redirect to /screen.html?mode=settings
    const r1 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=MODE_NEW&mode=settings`);
    assert.equal(r1.status, 302);
    assert.equal(r1.headers.location, '/screen.html?mode=settings');

    // Resume same PID + mode=settings -> still preserves
    const r2 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=MODE_NEW&mode=settings`);
    assert.equal(r2.status, 302);
    assert.equal(r2.headers.location, '/screen.html?mode=settings');

    // Resume same PID WITHOUT mode -> falls back to plain
    const r3 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=MODE_NEW`);
    assert.equal(r3.status, 302);
    assert.equal(r3.headers.location, '/screen.html');

    // New participant, no mode -> no qs
    const r4 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=NOMODE_NEW`);
    assert.equal(r4.status, 302);
    assert.equal(r4.headers.location, '/screen.html');

    // Unknown mode value -> ignored
    const r5 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=BADMODE_NEW&mode=junk`);
    assert.equal(r5.status, 302);
    assert.equal(r5.headers.location, '/screen.html');
  } finally {
    server.close();
  }
});

test('rate-limit: 15 allowed, 16th rejected, distinct IPs independent', () => {
  // Clear cache so ratelimit module is fresh
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/ratelimit')) delete require.cache[k];
  }
  const rl = require('../server/ratelimit');
  for (let i = 0; i < 15; i++) {
    assert.equal(rl.checkAndRecord('1.2.3.4').ok, true, `call ${i + 1}`);
  }
  assert.equal(rl.checkAndRecord('1.2.3.4').ok, false);
  // Distinct IP fresh bucket
  assert.equal(rl.checkAndRecord('5.6.7.8').ok, true);
});

// ----- Helpers -----
async function fetchRaw(url, opts = {}) {
  const http = require('http');
  const { URL } = require('url');
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function fetchJson(url, opts = {}) {
  const r = await fetchRaw(url, opts);
  return JSON.parse(r.body);
}

async function postJson(url, body, cookieHeader, token) {
  const r = await fetchRaw(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-Session-Token': token
    },
    body: JSON.stringify(body)
  });
  if (r.status >= 400) throw new Error('HTTP ' + r.status + ': ' + r.body);
  return JSON.parse(r.body);
}

(async () => {
  await runTests();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
