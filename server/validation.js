const {
  S1_TIERS, S3_TIERS, S3_REASON_OPTIONS, SUPP_QUESTIONS, COMP_MODELS,
  AI_USAGE_OPTIONS, DEMOGRAPHICS
} = require('./content');

const MAX_TEXT = 500;
const MAX_SHORT_TEXT = 100;

function isBool(v) { return typeof v === 'boolean'; }
function isStr(v, max) { return typeof v === 'string' && v.length <= max; }
function inSet(v, set) { return set.includes(v); }
function isInt(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi; }

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

function validateScenario1(body) {
  const b = body || {};
  const fields = {};
  // s1_none and per-tier are mutually exclusive
  if (b.s1_none === true) {
    fields.s1_none = true;
    for (const t of S1_TIERS) fields[t.key] = null;
    return { ok: true, fields };
  }
  // require all 6 tiers to be boolean
  for (const t of S1_TIERS) {
    if (!isBool(b[t.key])) return { ok: false, error: 'scenario1_incomplete' };
    fields[t.key] = b[t.key];
  }
  fields.s1_none = false;
  return { ok: true, fields };
}

function validateScenario2(body) {
  const b = body || {};
  if (!inSet(b.s2_response, ['yes', 'no', 'not_sure'])) {
    return { ok: false, error: 'scenario2_invalid' };
  }
  return { ok: true, fields: { s2_response: b.s2_response } };
}

function validateScenario3(body) {
  const b = body || {};
  const fields = {};
  let allNo = false;

  if (b.s3_none === true) {
    fields.s3_none = true;
    for (const t of S3_TIERS) fields[t.key] = null;
    allNo = true;
  } else {
    for (const t of S3_TIERS) {
      if (!isBool(b[t.key])) return { ok: false, error: 'scenario3_incomplete' };
      fields[t.key] = b[t.key];
    }
    fields.s3_none = false;
    allNo = S3_TIERS.every(t => b[t.key] === false);
  }

  // Follow-up reason is required iff allNo is true (or s3_none true).
  if (allNo) {
    const allowed = S3_REASON_OPTIONS.map(o => o.value);
    if (!inSet(b.s3_reason, allowed)) {
      return { ok: false, error: 'scenario3_reason_required' };
    }
    fields.s3_reason = b.s3_reason;
    if (b.s3_reason === 'other') {
      if (!isStr(b.s3_reason_other, MAX_TEXT) || b.s3_reason_other.trim().length === 0) {
        return { ok: false, error: 'scenario3_reason_other_required' };
      }
      fields.s3_reason_other = b.s3_reason_other.trim();
    } else {
      fields.s3_reason_other = null;
    }
  } else {
    fields.s3_reason = null;
    fields.s3_reason_other = null;
  }
  return { ok: true, fields };
}

function validateSupplementary(body) {
  const b = body || {};
  const fields = {};
  for (const q of SUPP_QUESTIONS) {
    const v = b[q.key];
    if (q.type === 'likert5') {
      if (!isInt(v, 1, 5)) return { ok: false, error: `supp_${q.id}_invalid` };
      fields[q.key] = v;
    } else if (q.type === 'choice') {
      const allowed = q.options.map(o => o.value);
      if (!inSet(v, allowed)) return { ok: false, error: `supp_${q.id}_invalid` };
      fields[q.key] = v;
    }
  }
  return { ok: true, fields };
}

function validateCompensation(body) {
  const b = body || {};
  const fields = {};
  // Ranks: each comp model has rank 1-5, all unique
  const ranks = [];
  for (const m of COMP_MODELS) {
    const r = b[`rank_${m.key}`];
    if (!isInt(r, 1, 5)) return { ok: false, error: 'comp_rank_invalid' };
    ranks.push(r);
    fields[`rank_${m.key}`] = r;
  }
  const sortedRanks = ranks.slice().sort();
  if (sortedRanks.join(',') !== '1,2,3,4,5') {
    return { ok: false, error: 'comp_rank_not_permutation' };
  }
  // Fairness + Practicality per model: 1-5
  for (const m of COMP_MODELS) {
    const fair = b[`fair_${m.key}`];
    const prac = b[`practical_${m.key}`];
    if (!isInt(fair, 1, 5)) return { ok: false, error: `fair_${m.key}_invalid` };
    if (!isInt(prac, 1, 5)) return { ok: false, error: `practical_${m.key}_invalid` };
    fields[`fair_${m.key}`] = fair;
    fields[`practical_${m.key}`] = prac;
  }
  return { ok: true, fields };
}

function validateAiUsage(body) {
  const b = body || {};
  const allowed = AI_USAGE_OPTIONS.map(o => o.value);
  if (!inSet(b.ai_usage, allowed)) return { ok: false, error: 'ai_usage_invalid' };
  return { ok: true, fields: { ai_usage: b.ai_usage } };
}

function validateAttitudes(body, attentionExpected) {
  const b = body || {};
  const fields = {};
  for (let i = 1; i <= 6; i++) {
    const key = `attitude_${i}`;
    const v = b[key];
    if (!isInt(v, 1, 7)) return { ok: false, error: `${key}_invalid` };
    fields[key] = v;
  }
  if (!isInt(b.attention_check_value, 1, 7)) {
    return { ok: false, error: 'attention_check_invalid' };
  }
  fields.attention_check_value = b.attention_check_value;
  fields.attention_check_pass = b.attention_check_value === attentionExpected;
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
  scenario_intro: validateScenarioIntro,
  data_type_intro: validateDataTypeIntro,
  comprehension: validateComprehension,
  scenario_1: validateScenario1,
  scenario_2: validateScenario2,
  scenario_3: validateScenario3,
  supplementary: validateSupplementary,
  compensation: validateCompensation,
  ai_usage: validateAiUsage,
  attitudes: validateAttitudes,
  demographics: validateDemographics,
  debrief: validateDebrief
};

module.exports = { VALIDATORS, MAX_TEXT, MAX_SHORT_TEXT };
