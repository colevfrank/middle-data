const {
  S1_TIERS, S2_TIERS, S2_REASON_OPTIONS, POST_QUESTIONS, OPEN_RESPONSE,
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

function validateScenarioIntro(body) {
  // No inputs beyond clicking Continue.
  return { ok: true, fields: {} };
}

function validateDataTypeIntro(body) {
  const fields = {};
  if (body && body.learn_more_clicked === true) {
    fields.learn_more_clicked = true;
    if (typeof body.learn_more_click_ts === 'number') {
      fields.learn_more_click_ts = new Date(body.learn_more_click_ts);
    }
  }
  return { ok: true, fields };
}

function validateComprehension(body, dataType, useCase) {
  const { answer_1, answer_2, answer_3 } = body || {};
  if (![answer_1, answer_2, answer_3].every(v => v === true || v === false)) {
    return { ok: false, error: 'comprehension_fields_required' };
  }
  // Correct answers: T, T, F
  const c1 = answer_1 === true;
  const c2 = answer_2 === true;
  const c3 = answer_3 === false;
  return {
    ok: true,
    fields: {
      comp_check_1_correct: c1,
      comp_check_2_correct: c2,
      comp_check_3_correct: c3
    },
    passed: c1 && c2 && c3
  };
}

// Scenario 1 = discount valuation. Single-select: the least discount the
// participant would accept (a tier value) or 'none'.
function validateScenario1(body) {
  const b = body || {};
  const allowed = S1_TIERS.map(t => t.value).concat('none');
  if (!inSet(b.s1_min_share, allowed)) return { ok: false, error: 'scenario1_invalid' };
  return { ok: true, fields: { s1_min_share: b.s1_min_share } };
}

// Scenario 2 = data marketplace. Single-select: the least revenue share the
// participant would accept (a tier value) or 'none'; declining requires a reason.
function validateScenario2(body) {
  const b = body || {};
  const allowed = S2_TIERS.map(t => t.value).concat('none');
  if (!inSet(b.s2_min_share, allowed)) return { ok: false, error: 'scenario2_invalid' };
  const fields = { s2_min_share: b.s2_min_share };

  if (b.s2_min_share === 'none') {
    const reasons = S2_REASON_OPTIONS.map(o => o.value);
    if (!inSet(b.s2_reason, reasons)) return { ok: false, error: 'scenario2_reason_required' };
    fields.s2_reason = b.s2_reason;
    if (b.s2_reason === 'other') {
      if (!isStr(b.s2_reason_other, MAX_TEXT) || b.s2_reason_other.trim().length === 0) {
        return { ok: false, error: 'scenario2_reason_other_required' };
      }
      fields.s2_reason_other = b.s2_reason_other.trim();
    } else {
      fields.s2_reason_other = null;
    }
  } else {
    fields.s2_reason = null;
    fields.s2_reason_other = null;
  }
  return { ok: true, fields };
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
  scenario_intro: validateScenarioIntro,
  data_type_intro: validateDataTypeIntro,
  comprehension: validateComprehension,
  scenario_1: validateScenario1,
  scenario_2: validateScenario2,
  open_response: validateOpenResponse,
  ai_usage: validateAiUsage,
  demographics: validateDemographics,
  debrief: validateDebrief
};

module.exports = { VALIDATORS, validatePostQuestion, MAX_TEXT, MAX_SHORT_TEXT };
