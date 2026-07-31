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
      const [pid, studyId, sessionId, token, dt, uc, so, pqo] = params;
      const row = {
        id: mockState.nextId++,
        prolific_pid: pid, study_id: studyId, session_id: sessionId, session_token: token,
        data_type: dt, use_case: uc,
        scenario_order: so, post_question_order: pqo,
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
const { VALIDATORS, validatePostQuestion } = require('../server/validation');
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
test('16 data types each with label, inline, definition, learn_more', () => {
  assert.equal(content.DATA_TYPES.length, 16);
  for (const d of content.DATA_TYPES) {
    assert.ok(d.label && d.inline && d.definition && d.learn_more && d.category);
  }
});
test('2 use cases B1 and B2 with data_use + intro_sentences', () => {
  assert.ok(content.USE_CASES.B1 && content.USE_CASES.B2);
  assert.ok(content.USE_CASES.B1.data_use && typeof content.USE_CASES.B1.intro_sentences === 'function');
  assert.ok(content.USE_CASES.B2.data_use && typeof content.USE_CASES.B2.intro_sentences === 'function');
});
test('14 post-scenario questions (13 + attention check)', () => {
  assert.equal(content.POST_QUESTIONS.length, 14);
  const ac = content.POST_QUESTIONS.find(q => q.type === 'attention');
  assert.ok(ac && ac.expected === 1);
});
test('5 AI-literacy questions', () => {
  assert.equal(content.AI_LITERACY_QUESTIONS.length, 5);
});
test('3 demographics questions', () => {
  assert.equal(content.DEMOGRAPHICS.length, 3);
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
  assert.deepEqual([...o.scenario_order].sort(), [1, 2]);
  assert.deepEqual([...o.post_question_order].sort((a, b) => a - b),
    Array.from({ length: 14 }, (_, i) => i + 1));
});
test('assignCell yields a valid cell (dt 1..16, uc B1/B2)', async () => {
  mockState.participants.clear();
  mockState.byPid.clear();
  const cell = await assignCell();
  assert.ok(cell.data_type >= 1 && cell.data_type <= 16);
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
test('intro: T,T,F + wrong counts → ok; stores per-item + overall fail counts', () => {
  const r = VALIDATORS.intro({
    answer_1: true, answer_2: true, answer_3: false,
    comp_check_1_wrong_count: 0, comp_check_2_wrong_count: 2, comp_check_3_wrong_count: 1,
    comp_check_fail_count: 2
  });
  assert.equal(r.ok, true);
  assert.equal(r.fields.comp_check_2_wrong_count, 2);
  assert.equal(r.fields.comp_check_fail_count, 2);
});
test('intro: wrong answers rejected (gate is client-side, server verifies)', () => {
  const bad = VALIDATORS.intro({
    answer_1: true, answer_2: true, answer_3: true,
    comp_check_1_wrong_count: 0, comp_check_2_wrong_count: 0, comp_check_3_wrong_count: 0
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'comprehension_not_passed');
});
test('intro: missing/invalid wrong or fail count rejected', () => {
  assert.equal(VALIDATORS.intro({ answer_1: true, answer_2: true, answer_3: false }).ok, false);
  assert.equal(VALIDATORS.intro({
    answer_1: true, answer_2: true, answer_3: false,
    comp_check_1_wrong_count: -1, comp_check_2_wrong_count: 0, comp_check_3_wrong_count: 0
  }).ok, false);
  // valid wrong counts but missing overall fail count → rejected
  assert.equal(VALIDATORS.intro({
    answer_1: true, answer_2: true, answer_3: false,
    comp_check_1_wrong_count: 0, comp_check_2_wrong_count: 0, comp_check_3_wrong_count: 0
  }).error, 'fail_count_invalid');
});
test('scenario_1: multi-select accepted set + mutually-exclusive none', () => {
  const ok = VALIDATORS.scenario_1({ s1_accepted_discounts: ['5off', '8off'], s1_none: false });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.fields.s1_accepted_discounts, ['5off', '8off']);
  assert.equal(ok.fields.s1_none, false);
  const declined = VALIDATORS.scenario_1({ s1_accepted_discounts: [], s1_none: true });
  assert.equal(declined.ok, true);
  assert.equal(declined.fields.s1_none, true);
  // empty + not declined → invalid; bad value → invalid; none + selections → conflict
  assert.equal(VALIDATORS.scenario_1({ s1_accepted_discounts: [], s1_none: false }).ok, false);
  assert.equal(VALIDATORS.scenario_1({ s1_accepted_discounts: ['bogus'], s1_none: false }).ok, false);
  assert.equal(VALIDATORS.scenario_1({ s1_accepted_discounts: ['5off'], s1_none: true }).ok, false);
});
test('scenario_2: multi-select accepted set + mutually-exclusive none', () => {
  const ok = VALIDATORS.scenario_2({ s2_accepted_shares: ['50', '75', '99'], s2_none: false });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.fields.s2_accepted_shares, ['50', '75', '99']);
  const declined = VALIDATORS.scenario_2({ s2_accepted_shares: [], s2_none: true });
  assert.equal(declined.ok, true);
  assert.equal(declined.fields.s2_none, true);
  assert.equal(VALIDATORS.scenario_2({ s2_accepted_shares: [], s2_none: false }).ok, false);
  assert.equal(VALIDATORS.scenario_2({ s2_accepted_shares: ['90'], s2_none: false }).ok, false); // 90 no longer a tier
  assert.equal(VALIDATORS.scenario_2({ s2_accepted_shares: ['50', '50'], s2_none: false }).ok, false); // dup
});
test('post-question likert5 (postq_1): 1-5 valid, out-of-range invalid', () => {
  assert.equal(validatePostQuestion({ postq_importance: 3 }, 'postq_1').ok, true);
  assert.equal(validatePostQuestion({ postq_importance: 3 }, 'postq_1').fields.postq_importance, 3);
  assert.equal(validatePostQuestion({ postq_importance: 6 }, 'postq_1').ok, false);
  assert.equal(validatePostQuestion({}, 'postq_1').ok, false);
});
test('post-question choice_num (postq_4): 0-3 valid, coerces strings', () => {
  assert.equal(validatePostQuestion({ postq_share_public: 0 }, 'postq_4').ok, true);
  assert.equal(validatePostQuestion({ postq_share_public: '2' }, 'postq_4').fields.postq_share_public, 2);
  assert.equal(validatePostQuestion({ postq_share_public: 4 }, 'postq_4').ok, false);
});
test('post-question choice (postq_7): yes/no/unsure', () => {
  assert.equal(validatePostQuestion({ postq_comp_by_amount: 'yes' }, 'postq_7').ok, true);
  assert.equal(validatePostQuestion({ postq_comp_by_amount: 'maybe' }, 'postq_7').ok, false);
});
test('post-question multiselect (postq_13): requires >=1, all valid, unique', () => {
  assert.equal(validatePostQuestion({ postq_concerns: ['too_personal', 'no_trust'] }, 'postq_13').ok, true);
  assert.equal(validatePostQuestion({ postq_concerns: [] }, 'postq_13').ok, false);
  assert.equal(validatePostQuestion({ postq_concerns: ['nope'] }, 'postq_13').ok, false);
  assert.equal(validatePostQuestion({ postq_concerns: ['no_trust', 'no_trust'] }, 'postq_13').ok, false);
});
test('post-question attention (postq_14): pass iff value === expected', () => {
  const pass = validatePostQuestion({ attention_check: 1 }, 'postq_14');
  assert.equal(pass.ok, true);
  assert.equal(pass.fields.attention_check_value, 1);
  assert.equal(pass.fields.attention_check_pass, true);
  const fail = validatePostQuestion({ attention_check: 3 }, 'postq_14');
  assert.equal(fail.fields.attention_check_pass, false);
});
test('open_response: optional free text; blank ok, long capped', () => {
  const blank = VALIDATORS.open_response({});
  assert.equal(blank.ok, true);
  assert.equal(blank.fields.open_data_revenue, null);
  const empty = VALIDATORS.open_response({ open_data_revenue: '   ' });
  assert.equal(empty.fields.open_data_revenue, null);
  const filled = VALIDATORS.open_response({ open_data_revenue: '  I have thoughts.  ' });
  assert.equal(filled.ok, true);
  assert.equal(filled.fields.open_data_revenue, 'I have thoughts.');
  const tooLong = VALIDATORS.open_response({ open_data_revenue: 'x'.repeat(5001) });
  assert.equal(tooLong.ok, false);
});
test('ai_usage: all 5 fields required', () => {
  assert.equal(VALIDATORS.ai_usage({ ai_tools_freq: 'daily' }).ok, false);
  const complete = VALIDATORS.ai_usage({
    ai_tools_freq: 'daily', social_media_freq: 'never',
    search_engine_freq: 'weekly', tech_current: 'no', tech_ever: 'yes'
  });
  assert.equal(complete.ok, true);
});
test('demographics: age/gender/education required', () => {
  const incomplete = VALIDATORS.demographics({ age_band: '25-34' });
  assert.equal(incomplete.ok, false);
  const complete = VALIDATORS.demographics({ age_band: '25-34', gender: 'man', education: 'bachelors' });
  assert.equal(complete.ok, true);
});
test('demographics: gender=other requires text', () => {
  const noText = VALIDATORS.demographics({ age_band: '25-34', gender: 'other', education: 'bachelors' });
  assert.equal(noText.ok, false);
  const withText = VALIDATORS.demographics({
    age_band: '25-34', gender: 'other', gender_other: 'genderqueer', education: 'bachelors'
  });
  assert.equal(withText.ok, true);
});

section('state machine');
const fakeParticipant = {
  scenario_order: [2, 1],
  current_screen: 'consent',
  data_type: 5, use_case: 'B1',
  post_question_order: [4, 1, 7, 14, 2, 5, 3, 8, 6, 11, 9, 13, 10, 12]
};
test('consent → welcome → intro', () => {
  assert.equal(nextAfter(fakeParticipant, 'consent'), 'welcome');
  assert.equal(nextAfter(fakeParticipant, 'welcome'), 'intro');
});
test('intro → first scenario per scenario_order', () => {
  assert.equal(nextAfter(fakeParticipant, 'intro'), 'scenario_2');
});
test('scenarios follow scenario_order, then first post-question', () => {
  assert.equal(nextAfter(fakeParticipant, 'scenario_2'), 'scenario_1');
  assert.equal(nextAfter(fakeParticipant, 'scenario_1'), 'postq_4');
});
test('post-questions follow post_question_order, then open_response', () => {
  assert.equal(nextAfter(fakeParticipant, 'postq_4'), 'postq_1');
  assert.equal(nextAfter(fakeParticipant, 'postq_1'), 'postq_7');
  assert.equal(nextAfter(fakeParticipant, 'postq_12'), 'open_response');
});
test('post-scenarios sequence', () => {
  assert.equal(nextAfter(fakeParticipant, 'open_response'), 'ai_usage');
  assert.equal(nextAfter(fakeParticipant, 'ai_usage'), 'demographics');
  assert.equal(nextAfter(fakeParticipant, 'demographics'), 'debrief');
  assert.equal(nextAfter(fakeParticipant, 'debrief'), 'complete');
});

section('screen content');
const dt5 = content.DATA_TYPES.find(d => d.id === 5);
test('welcome screen carries intro copy', () => {
  const p = screenPayload(fakeParticipant, 'welcome');
  assert.equal(p.screen, 'welcome');
  assert.ok(p.body.join(' ').includes('open-ended'));
});
test('intro screen: App Z setup + data type (longer def inline) + use case + comprehension', () => {
  const p = screenPayload(fakeParticipant, 'intro');
  assert.equal(p.screen, 'intro');
  const setup = p.setup.join(' ');
  assert.ok(setup.includes('App Z'));
  assert.ok(setup.includes('$20 per month'));
  assert.ok(setup.includes('deletes any data it holds after one year'));
  const change = p.change.join(' ');
  assert.ok(change.includes(dt5.label));                       // data type named
  assert.ok(change.includes(dt5.learn_more.slice(1)));         // longer (example) def shown inline
  assert.ok(change.includes(dt5.inline));                      // use-case sentence uses inline
  assert.ok(change.includes('personalization algorithm'));     // B1 use-case wording
  // Comprehension bundled on the same screen
  assert.equal(p.comprehension.statements.length, 3);
  assert.ok(p.comprehension.statements[0].text.includes(dt5.definition)); // SHORT def in check
  assert.ok(p.comprehension.statements[1].text.includes('improve its personalization algorithm')); // matches narrative
  assert.ok(p.comprehension.statements[2].text.includes('permanently deleted after 30 days'));
  assert.ok(p.comprehension.statements[0].text.startsWith('The data you would share with App Z'));
});
test('intro screen B2 uses the AI-training use-case wording', () => {
  const p = screenPayload({ ...fakeParticipant, use_case: 'B2' }, 'intro');
  assert.ok(p.change.join(' ').includes('generative AI system'));
});
test('scenario_1 (Subscription Discount): settings-frame payload + first-person use', () => {
  const p = screenPayload(fakeParticipant, 'scenario_1');
  assert.equal(p.heading, 'Subscription');
  assert.ok(p.lead_in.join(' ').includes('Subscription Discount'));
  assert.equal(p.collect_line, `We will collect your ${dt5.inline}`);
  assert.deepEqual(p.collect_emphasis, [dt5.inline]);
  assert.ok(p.use_line.includes('improve our personalization algorithm')); // first-person "our"
  assert.deepEqual(p.tiers, content.S1_TIERS);
  assert.equal(p.none_label, 'I would not accept any discount');
  assert.deepEqual(p.submit, { accepted: 's1_accepted_discounts', none: 's1_none' });
  // Generic "your information" in the by-default line (not the data type)
  assert.ok(p.intro.join(' ').includes('we do not sell your information'));
});
test('scenario_2 (Data Sharing Program): renamed + multi-select payload', () => {
  const p = screenPayload(fakeParticipant, 'scenario_2');
  assert.equal(p.heading, 'Data Sharing Program');
  assert.ok(p.frame_url.includes('data-sharing'));
  assert.ok(p.offer_line.includes('percentage of the revenue'));
  assert.deepEqual(p.tiers.map(t => t.value), ['1', '10', '25', '50', '75', '99']);
  assert.equal(p.none_label, 'I would not agree to this program');
  assert.deepEqual(p.submit, { accepted: 's2_accepted_shares', none: 's2_none' });
});
test('scenario copy is voice-neutral (voice=appx unchanged)', () => {
  const r = screenPayload(fakeParticipant, 'scenario_1');
  const a = screenPayload(fakeParticipant, 'scenario_1', { voice: 'appx' });
  assert.deepEqual(r, a);
});
test('post-question payload carries the item + substituted prompt', () => {
  const p = screenPayload(fakeParticipant, 'postq_1');
  assert.equal(p.kind, 'post_question');
  assert.equal(p.screen, 'postq_1');
  assert.equal(p.item.key, 'postq_importance');
  assert.equal(p.item.type, 'likert5');
  assert.ok(p.item.prompt.includes(dt5.label));
});
test('post-question B-block substitutes the use case data_use form', () => {
  const p = screenPayload(fakeParticipant, 'postq_7');
  assert.equal(p.item.key, 'postq_comp_by_amount');
  assert.ok(p.item.prompt.includes(content.USE_CASES.B1.data_use));
});
test('attention-check payload (postq_14) renders as a plain item', () => {
  const p = screenPayload(fakeParticipant, 'postq_14');
  assert.equal(p.item.type, 'attention');
  assert.equal(p.item.key, 'attention_check');
  assert.ok(p.item.anchors);
});
test('open_response screen carries the prompt + field key', () => {
  const p = screenPayload(fakeParticipant, 'open_response');
  assert.equal(p.screen, 'open_response');
  assert.equal(p.field, 'open_data_revenue');
  assert.ok(p.prompt.includes('source of revenue'));
});
test('ai_usage lists the 5 literacy questions', () => {
  const p = screenPayload(fakeParticipant, 'ai_usage');
  assert.equal(p.items.length, 5);
  assert.equal(p.items[0].key, 'ai_tools_freq');
});
test('demographics list matches DEMOGRAPHICS', () => {
  const p = screenPayload(fakeParticipant, 'demographics');
  assert.equal(p.items.length, content.DEMOGRAPHICS.length);
});
test('progressFor returns increasing values, ending at 100', () => {
  const before = progressFor('consent', fakeParticipant);
  const mid = progressFor('postq_1', fakeParticipant);
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
    assert.equal(next.screen, 'welcome');

    // 3b. welcome
    next = await postJson(`http://localhost:${port}/screen/welcome`, { timestamp_shown: 0, timestamp_submitted: 1 }, cookieHeader, token);
    assert.equal(next.screen, 'intro');

    // 4. intro (merged setup + data type + comprehension) — pass with wrong counts
    next = await postJson(`http://localhost:${port}/screen/intro`, {
      answer_1: true, answer_2: true, answer_3: false,
      comp_check_1_wrong_count: 0, comp_check_2_wrong_count: 1, comp_check_3_wrong_count: 0,
      comp_check_fail_count: 1
    }, cookieHeader, token);
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

    // Resume same PID WITHOUT mode -> no mode qs (client now defaults to settings)
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

    // Explicit opt-out ?mode=plain is forwarded so the client can override the default
    const r6 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=PLAIN_NEW&mode=plain`);
    assert.equal(r6.status, 302);
    assert.equal(r6.headers.location, '/screen.html?mode=plain');
  } finally {
    server.close();
  }
});

test('/start preserves ?voice=appx in redirect, alone and combined with mode', async () => {
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

  const port = 31995;
  const server = app.listen(port);

  try {
    // voice=appx alone -> /screen.html?voice=appx
    const r1 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=VOICE_NEW&voice=appx`);
    assert.equal(r1.status, 302);
    assert.equal(r1.headers.location, '/screen.html?voice=appx');

    // Resume same PID + voice=appx -> still preserves
    const r2 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=VOICE_NEW&voice=appx`);
    assert.equal(r2.status, 302);
    assert.equal(r2.headers.location, '/screen.html?voice=appx');

    // mode=settings + voice=appx combined -> both preserved in order
    const r3 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=BOTH_NEW&mode=settings&voice=appx`);
    assert.equal(r3.status, 302);
    assert.equal(r3.headers.location, '/screen.html?mode=settings&voice=appx');

    // Unknown voice value -> ignored
    const r4 = await fetchRaw(`http://localhost:${port}/start?PROLIFIC_PID=BADVOICE_NEW&voice=junk`);
    assert.equal(r4.status, 302);
    assert.equal(r4.headers.location, '/screen.html');
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
