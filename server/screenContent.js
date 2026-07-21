// Build the JSON payload sent to the client for each screen.
// CRITICAL: never send raw condition codes (data_type number, use_case code) — only rendered strings.

const {
  DATA_TYPES, USE_CASES, S1_TIERS, S2_TIERS, S2_REASON_OPTIONS,
  POST_QUESTIONS, OPEN_RESPONSE, AI_LITERACY_QUESTIONS, DEMOGRAPHICS
} = require('./content');

function getDataType(p) {
  return DATA_TYPES.find(d => d.id === p.data_type);
}

function getUseCase(p) {
  return USE_CASES[p.use_case];
}

function pickVoice(extra) {
  return extra && extra.voice === 'appx' ? 'appx' : 'researcher';
}

// Scenario copy bundles, keyed by voice. `researcher` is the original
// experimenter-narrated wording; `appx` is the pilot variant written as if
// AppX's product team is consulting the participant. Selected per request via
// ?voice=appx (orthogonal to ?mode=settings).
// s1 = discount valuation; s2 = data marketplace.
const SCENARIO_COPY = {
  researcher: {
    s1: {
      prompt: (dt, uc) => `AppX offers you a discount on your $20/month subscription if you agree to share your ${dt.inline} to ${uc.verbatim}.`,
      instruction: 'What is the least you would accept in exchange for sharing your data?',
      none_label: 'I would not share at any price'
    },
    s2: {
      intro: 'Imagine the following arrangement with AppX.',
      lead: (dt) => [
        `You pay $20 per month for AppX. By default, AppX does not record, store, or sell your ${dt.inline}.`,
        'AppX offers you the option to join a data marketplace program. If you opt in:'
      ],
      bullets: (dt) => [
        `AppX will sell your ${dt.inline} to third-party companies on your behalf.`,
        'You will receive a percentage of the selling price back as a discount on your monthly subscription.',
        'You can opt out at any time, but data that has already been sold cannot be taken back.'
      ],
      instruction: 'What is the least revenue share you would accept to sell your data?',
      none_label: 'I would not participate at any revenue share',
      followup_prompt: 'What is the main reason you chose not to participate?'
    }
  },
  appx: {
    s1: {
      prompt: (dt, uc) => `We're considering a new program: users could share their ${dt.inline} with us — we'd use it to ${uc.verbatim} — in exchange for a discount on their $20/month subscription.`,
      instruction: 'To help us design fair pricing, tell us — what is the least you would accept in exchange for sharing your data?',
      none_label: 'I would not share at any price'
    },
    s2: {
      intro: "We're exploring an opt-in data marketplace program for our users.",
      lead: (dt) => [
        `You currently pay $20 per month for AppX. We don't record, store, or sell your ${dt.inline}.`,
        "We're considering offering an opt-in marketplace program. If you joined:"
      ],
      bullets: (dt) => [
        `We would sell your ${dt.inline} to third-party companies on your behalf.`,
        'You would receive a percentage of the selling price back as a discount on your monthly subscription.',
        "You could opt out at any time, but data that's already been sold could not be taken back."
      ],
      instruction: "To help us design fair revenue sharing, tell us — what is the least revenue share you would accept to sell your data?",
      none_label: 'I would not participate at any revenue share',
      followup_prompt: 'What is the main reason you chose not to participate?'
    }
  }
};

// Payload for a single post-scenario question screen (postq_<id>). The attention
// check renders exactly like a likert5 item — its instruction lives in the prompt.
function postQuestionPayload(p, screenId) {
  const dt = getDataType(p);
  const uc = getUseCase(p);
  const qid = parseInt(screenId.split('_')[1], 10);
  const q = POST_QUESTIONS.find(x => x.id === qid);
  const item = { id: q.id, key: q.key, type: q.type, prompt: q.prompt(dt, uc) };
  if (q.type === 'likert5' || q.type === 'attention') {
    item.anchors = q.anchors;
  } else {
    item.options = q.options.map(o => ({ value: o.value, label: o.label }));
  }
  return {
    screen: screenId,
    kind: 'post_question',
    data_label: dt.label,
    item
  };
}

function screenPayload(p, screenId, extra = {}) {
  if (/^postq_\d+$/.test(screenId)) {
    return postQuestionPayload(p, screenId);
  }

  const dt = getDataType(p);
  const uc = getUseCase(p);

  switch (screenId) {
    case 'consent': {
      const fs = require('fs');
      const path = require('path');
      let consentText = '';
      try {
        consentText = fs.readFileSync(path.join(__dirname, '..', 'CONSENT.md'), 'utf8');
      } catch (e) { /* ignore */ }
      return { screen: 'consent', consent_text: consentText };
    }

    case 'welcome': {
      return {
        screen: 'welcome',
        body: [
          'This survey has multiple-choice and checkbox questions, with one open-ended response question.',
          'Once you advance, you will not be able to return to previous places, so please consider each question carefully before clicking next.',
          'Click "Continue" when you are ready to begin.'
        ]
      };
    }

    case 'scenario_intro': {
      return {
        screen: 'scenario_intro',
        body: [
          'You use an online service, called AppX! You currently pay $20 per month to use it.',
          'By default, AppX does not record, store, or sell any of your information beyond what is strictly necessary to operate the service. AppX also deletes any data it holds after one year.'
        ],
        retry: !!extra.retry
      };
    }

    case 'data_type_intro': {
      // Short definition lower-cased to read after "…which is"; the longer,
      // example-rich description goes in the "Learn more" expansion.
      const def = dt.definition;
      const defInline = def.charAt(0).toLowerCase() + def.slice(1);
      return {
        screen: 'data_type_intro',
        data_label: dt.label,
        body: [
          `Earlier this year, AppX became interested in collecting ${dt.label}, which is ${defInline}.`,
          `AppX would like to use your ${dt.inline} for ${uc.data_use}.`
        ],
        learn_more_text: dt.learn_more,
        retry: !!extra.retry
      };
    }

    case 'comprehension': {
      return {
        screen: 'comprehension',
        retry: !!extra.retry,
        statements: [
          {
            id: 1,
            text: `The data you would share with AppX is: ${dt.definition}`
          },
          {
            id: 2,
            text: `AppX would use your data to ${uc.verbatim}.`
          },
          {
            id: 3,
            text: 'AppX guarantees that your data will be permanently deleted after 30 days.'
          }
        ]
      };
    }

    case 'scenario_1': {
      const c = SCENARIO_COPY[pickVoice(extra)].s1;
      return {
        screen: 'scenario_1',
        prompt: c.prompt(dt, uc),
        instruction: c.instruction,
        tiers: S1_TIERS,
        none_label: c.none_label
      };
    }

    case 'scenario_2': {
      const c = SCENARIO_COPY[pickVoice(extra)].s2;
      return {
        screen: 'scenario_2',
        intro: c.intro,
        lead: c.lead(dt),
        bullets: c.bullets(dt),
        instruction: c.instruction,
        tiers: S2_TIERS,
        none_label: c.none_label,
        followup_prompt: c.followup_prompt,
        followup_options: S2_REASON_OPTIONS
      };
    }

    case 'open_response': {
      return {
        screen: 'open_response',
        prompt: OPEN_RESPONSE.prompt,
        field: OPEN_RESPONSE.key
      };
    }

    case 'ai_usage': {
      return {
        screen: 'ai_usage',
        intro: 'A few questions about the tools you use.',
        items: AI_LITERACY_QUESTIONS.map(q => ({
          key: q.key, prompt: q.prompt, options: q.options
        }))
      };
    }

    case 'demographics': {
      return {
        screen: 'demographics',
        items: DEMOGRAPHICS
      };
    }

    case 'debrief': {
      return {
        screen: 'debrief',
        body: [
          'Thank you for completing this study.',
          'The purpose of this study is to understand how people value different types of personal data, and whether their preferences change depending on what the data will be used for—particularly when it is used to train generative AI systems versus more traditional uses like advertising and recommendations.',
          'The "AppX" service in this survey was hypothetical. No company called AppX collected any of your information, and your responses to the scenarios will not be shared with any third party.',
          'Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Sarah Cen at sarah.cen@gmail.com.',
          'IRB Protocol: STUDY2026_00000225 — Carnegie Mellon University'
        ]
      };
    }

    default:
      return { screen: screenId };
  }
}

function progressFor(screenId, participant) {
  const order = ['consent', 'welcome', 'scenario_intro', 'data_type_intro', 'comprehension'];
  for (const n of participant.scenario_order) order.push(`scenario_${n}`);
  for (const qid of participant.post_question_order) order.push(`postq_${qid}`);
  order.push('open_response', 'ai_usage', 'demographics', 'debrief');
  const idx = order.indexOf(screenId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

module.exports = { screenPayload, progressFor };
