const {
  S1_TIERS, S2_TIERS, POST_QUESTIONS, OPEN_RESPONSE,
  AI_LITERACY_QUESTIONS, DEMOGRAPHICS
} = require('./content');

const MAX_TEXT = 500;
const MAX_SHORT_TEXT = 100;
const MAX_OPEN_TEXT = 5000;

function isBool(v) { return typeof v === 'boolean'; }
function isStr(v, max) { return typeof v === 'string' && v.length <= max; }
function inSet(v, set) { return set.includes(v); }
function isInt(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi; }
function toInt(v) { return typeof v === 'number' ? v : (typeof v === 'string' && /^-?\d+$/.test(v) ? parseInt(v, 10) : NaN); }

// Each validator returns { ok: true, fields: {...} } or { ok: false, error: '...' }.
// `fields` maps column name → value, suitable for direct DB write.

function validateConsent(body) {
  const { consent_age_ok, consent_read, consent_participate } = body || {};
  if (![consent_age_ok, consent_read, consent_participate].every(isBool)) {
    return { ok: false, error: 'consent_fields_required' };
  }
  return {
    ok: true,
    fields: { consent_age_ok, consent_read, consent_participate },
    consented: consent_age_ok && consent_read && consent_participate
  };
}

function validateWelcome(body) {
  // No inputs beyond clicking Continue.
  return { ok: true, fields: {} };
}

function validateScenarioTransition(body) {
  // No inputs beyond clicking the button.
  return { ok: true, fields: {} };
}

// Merged intro screen: App Z setup + data type + comprehension. The client gates
// Continue until all three T/F items are correct (T,T,F), so a valid submit always
// carries the correct answers plus a per-question wrong-attempt count. We re-verify
// the answers server-side as a safety net.
function validateIntro(body) {
  const b = body || {};
  const { answer_1, answer_2, answer_3 } = b;
  if (![answer_1, answer_2, answer_3].every(v => v === true || v === false)) {
    return { ok: false, error: 'comprehension_fields_required' };
  }
  if (!(answer_1 === true && answer_2 === true && answer_3 === false)) {
    return { ok: false, error: 'comprehension_not_passed' };
  }
  const fields = {};
  for (const i of [1, 2, 3]) {
    const w = b[`comp_check_${i}_wrong_count`];
    if (!isInt(w, 0, 1000)) return { ok: false, error: 'wrong_count_invalid' };
    fields[`comp_check_${i}_wrong_count`] = w;
  }
  // Overall failed-attempt count (once per Continue click with any wrong answer).
  if (!isInt(b.comp_check_fail_count, 0, 1000)) return { ok: false, error: 'fail_count_invalid' };
  fields.comp_check_fail_count = b.comp_check_fail_count;
  return { ok: true, fields };
}

// Multi-select scenario: participant checks all acceptable tier values, or the
// mutually-exclusive "none" (declined). Stored as an array + a boolean.
function validateMultiSelect(body, tiers, acceptedKey, noneKey) {
  const b = body || {};
  const declined = b[noneKey] === true;
  const accepted = Array.isArray(b[acceptedKey]) ? b[acceptedKey] : null;
  if (accepted === null) return { ok: false, error: `${acceptedKey}_missing` };
  if (declined) {
    if (accepted.length) return { ok: false, error: `${acceptedKey}_conflict` };
    return { ok: true, fields: { [acceptedKey]: [], [noneKey]: true } };
  }
  if (accepted.length === 0) return { ok: false, error: `${acceptedKey}_empty` };
  if (new Set(accepted).size !== accepted.length) return { ok: false, error: `${acceptedKey}_dup` };
  const allowed = tiers.map(t => t.value);
  if (!accepted.every(v => allowed.includes(v))) return { ok: false, error: `${acceptedKey}_invalid` };
  return { ok: true, fields: { [acceptedKey]: accepted, [noneKey]: false } };
}

// Scenario 1 = Subscription Discount (multi-select: which discounts they'd accept).
function validateScenario1(body) {
  return validateMultiSelect(body, S1_TIERS, 's1_accepted_discounts', 's1_none');
}

// Scenario 2 = Data Sharing Program (multi-select: which revenue shares they'd accept).
function validateScenario2(body) {
  return validateMultiSelect(body, S2_TIERS, 's2_accepted_shares', 's2_none');
}

// Validate a single post-scenario question screen (postq_<id>).
function validatePostQuestion(body, screenId) {
  const b = body || {};
  const qid = parseInt(String(screenId).split('_')[1], 10);
  const q = POST_QUESTIONS.find(x => x.id === qid);
  if (!q) return { ok: false, error: 'unknown_post_question' };

  const v = b[q.key];
  const fields = {};

  if (q.type === 'likert5') {
    if (!isInt(v, 1, 5)) return { ok: false, error: `${q.key}_invalid` };
    fields[q.key] = v;
  } else if (q.type === 'attention') {
    if (!isInt(v, 1, 5)) return { ok: false, error: 'attention_check_invalid' };
    fields.attention_check_value = v;
    fields.attention_check_pass = v === q.expected;
  } else if (q.type === 'choice_num') {
    const n = toInt(v);
    const allowed = q.options.map(o => o.value);
    if (!inSet(n, allowed)) return { ok: false, error: `${q.key}_invalid` };
    fields[q.key] = n;
  } else if (q.type === 'choice') {
    const allowed = q.options.map(o => o.value);
    if (!inSet(v, allowed)) return { ok: false, error: `${q.key}_invalid` };
    fields[q.key] = v;
  } else if (q.type === 'multiselect') {
    const allowed = q.options.map(o => o.value);
    if (!Array.isArray(v) || v.length === 0) return { ok: false, error: `${q.key}_required` };
    const uniq = new Set(v);
    if (uniq.size !== v.length) return { ok: false, error: `${q.key}_invalid` };
    if (!v.every(x => allowed.includes(x))) return { ok: false, error: `${q.key}_invalid` };
    fields[q.key] = v;
  } else {
    return { ok: false, error: 'unknown_post_question_type' };
  }
  return { ok: true, fields };
}

// Open-ended response — optional free text (a blank answer is allowed).
function validateOpenResponse(body) {
  const b = body || {};
  const v = b[OPEN_RESPONSE.key];
  if (v == null || (typeof v === 'string' && v.trim() === '')) {
    return { ok: true, fields: { [OPEN_RESPONSE.key]: null } };
  }
  if (!isStr(v, MAX_OPEN_TEXT)) return { ok: false, error: 'open_response_invalid' };
  return { ok: true, fields: { [OPEN_RESPONSE.key]: v.trim() } };
}

function validateAiUsage(body) {
  const b = body || {};
  const fields = {};
  for (const q of AI_LITERACY_QUESTIONS) {
    const allowed = q.options.map(o => o.value);
    const v = b[q.key];
    if (!inSet(v, allowed)) return { ok: false, error: `${q.key}_invalid` };
    fields[q.key] = v;
  }
  return { ok: true, fields };
}

function validateDemographics(body) {
  const b = body || {};
  const fields = {};
  for (const d of DEMOGRAPHICS) {
    const allowed = d.options.map(o => o.value);
    const v = b[d.key];
    if (!inSet(v, allowed)) return { ok: false, error: `${d.key}_invalid` };
    fields[d.key] = v;
    if (d.key === 'gender' && v === 'other') {
      if (!isStr(b.gender_other, MAX_SHORT_TEXT) || b.gender_other.trim().length === 0) {
        return { ok: false, error: 'gender_other_required' };
      }
      fields.gender_other = b.gender_other.trim();
    }
  }
  return { ok: true, fields };
}

function validateDebrief(body) {
  return { ok: true, fields: {} };
}

const VALIDATORS = {
  consent: validateConsent,
  welcome: validateWelcome,
  intro: validateIntro,
  scenario_1: validateScenario1,
  scenario_2: validateScenario2,
  scenario_transition: validateScenarioTransition,
  open_response: validateOpenResponse,
  ai_usage: validateAiUsage,
  demographics: validateDemographics,
  debrief: validateDebrief
};

module.exports = { VALIDATORS, validatePostQuestion, MAX_TEXT, MAX_SHORT_TEXT };
