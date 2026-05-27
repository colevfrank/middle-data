// Build the JSON payload sent to the client for each screen.
// CRITICAL: never send raw condition codes (data_type number, use_case code) — only rendered strings.

const {
  DATA_TYPES, USE_CASES, LEARN_MORE_TEXT, S1_TIERS, S3_TIERS, S3_REASON_OPTIONS,
  SUPP_QUESTIONS, COMP_MODELS, AI_USAGE_OPTIONS, ATTITUDE_ITEMS,
  ATTENTION_CHECK_TEXT, LIKERT7_ANCHORS, DEMOGRAPHICS
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
const SCENARIO_COPY = {
  researcher: {
    s1: {
      prompt: (dt, uc) => `AppX offers you a discount on your $20/month subscription if you agree to share your ${dt.inline} to ${uc.verbatim}.`,
      instruction: 'For each discount amount below, would you share your data?',
      none_label: 'I would not share at any price'
    },
    s2: {
      reminder: (dt, uc) => `Reminder: AppX would use your ${dt.inline} to ${uc.verbatim}.`,
      intro:    (dt)     => `Instead of a discount, AppX offers you an additional feature in exchange for sharing your ${dt.inline}.`,
      feature:  'The feature is: Premium features — priority access to new features, additional storage, and an ad-free experience.',
      prompt:   (dt)     => `Would you share your ${dt.inline} in exchange for this feature?`
    },
    s3: {
      intro: 'Now imagine a different arrangement.',
      setup: (dt) => [
        `You pay $20 per month for AppX. By default, AppX does not record, store, or sell your ${dt.inline}.`,
        'AppX offers you the option to join a data marketplace program. If you opt in:',
        `AppX will sell your ${dt.inline} to third-party companies on your behalf.`,
        'You will receive a percentage of the selling price back as a discount on your monthly subscription.',
        'You can opt out at any time, but data that has already been sold cannot be taken back.'
      ],
      instruction: 'For each revenue share below, would you participate?',
      none_label: 'I would not participate at any revenue share',
      followup_prompt: 'What is the main reason you chose not to participate?'
    }
  },
  appx: {
    s1: {
      prompt: (dt, uc) => `We're considering a new program: users could share their ${dt.inline} with us — we'd use it to ${uc.verbatim} — in exchange for a discount on their $20/month subscription.`,
      instruction: 'To help us design fair pricing, tell us — for each discount amount below, would you be willing to share?',
      none_label: 'I would not share at any price'
    },
    s2: {
      reminder: (dt, uc) => `As a reminder: we'd use your ${dt.inline} to ${uc.verbatim}.`,
      intro:    (dt)     => `We're offering users the opportunity to unlock additional functionality by sharing their ${dt.inline} with us.`,
      feature:  'The feature: Premium features — priority access to new features, additional storage, and an ad-free experience.',
      prompt:   (dt)     => `Would you share your ${dt.inline} with us to unlock this feature?`
    },
    s3: {
      intro: "We're exploring an opt-in data marketplace program for our users.",
      setup: (dt) => [
        `You currently pay $20 per month for AppX. We don't record, store, or sell your ${dt.inline}.`,
        "We're considering offering an opt-in marketplace program. If you joined:",
        `We would sell your ${dt.inline} to third-party companies on your behalf.`,
        'You would receive a percentage of the selling price back as a discount on your monthly subscription.',
        "You could opt out at any time, but data that's already been sold could not be taken back."
      ],
      instruction: "To help us design fair revenue sharing, tell us — for each revenue share below, would you participate?",
      none_label: 'I would not participate at any revenue share',
      followup_prompt: 'What is the main reason you chose not to participate?'
    }
  }
};

function screenPayload(p, screenId, extra = {}) {
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

    case 'scenario_intro': {
      return {
        screen: 'scenario_intro',
        intro: 'Imagine you subscribe to AppX, an online service from a technology company. You currently pay $20/month for this service.',
        use_case_text: uc.intro_text,
        retry: !!extra.retry
      };
    }

    case 'data_type_intro': {
      return {
        screen: 'data_type_intro',
        data_label: dt.label,
        data_definition: dt.definition,
        learn_more_text: LEARN_MORE_TEXT,
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
        reminder: c.reminder(dt, uc),
        intro: c.intro(dt),
        feature: c.feature,
        prompt: c.prompt(dt),
        options: [
          { value: 'yes',      label: 'Yes' },
          { value: 'no',       label: 'No' },
          { value: 'not_sure', label: 'Not sure' }
        ]
      };
    }

    case 'scenario_3': {
      const c = SCENARIO_COPY[pickVoice(extra)].s3;
      return {
        screen: 'scenario_3',
        intro: c.intro,
        setup: c.setup(dt),
        instruction: c.instruction,
        tiers: S3_TIERS,
        none_label: c.none_label,
        followup_prompt: c.followup_prompt,
        followup_options: S3_REASON_OPTIONS
      };
    }

    case 'supplementary': {
      const order = p.supp_question_order;
      const s4OptOrder = p.s4_option_order;
      const items = order.map(qid => {
        const q = SUPP_QUESTIONS.find(x => x.id === qid);
        const item = {
          id: q.id,
          key: q.key,
          prompt: q.prompt,
          type: q.type
        };
        if (q.type === 'likert5') {
          item.anchors = q.anchors;
        } else {
          let opts = q.options;
          if (q.id === 4) {
            opts = s4OptOrder.map(i => q.options[i]);
          }
          item.options = opts.map(({ pin_last, ...rest }) => rest);
        }
        return item;
      });
      return {
        screen: 'supplementary',
        data_label: dt.label,
        context_line: `The following questions all refer to: ${dt.label}.`,
        items
      };
    }

    case 'compensation': {
      const order = p.comp_model_order;
      const items = order.map(mid => {
        const m = COMP_MODELS.find(x => x.id === mid);
        return { key: m.key, label: m.label, description: m.description };
      });
      return {
        screen: 'compensation',
        ranking_prompt: 'If companies were to compensate you for using your data, which model would you prefer? Rank from most (1) to least (5) preferred.',
        rating_intro: 'For each model, please rate:',
        items
      };
    }

    case 'ai_usage': {
      return {
        screen: 'ai_usage',
        prompt: 'How often do you use AI tools (such as ChatGPT, Claude, Gemini, Copilot, etc.)?',
        options: AI_USAGE_OPTIONS
      };
    }

    case 'attitudes': {
      const order = p.attitude_item_order;
      const pos = p.attention_check_position;
      const items = order.map(id => {
        const a = ATTITUDE_ITEMS.find(x => x.id === id);
        return { kind: 'attitude', key: a.key, text: a.text };
      });
      items.splice(pos, 0, {
        kind: 'attention',
        key: 'attention_check_value',
        text: ATTENTION_CHECK_TEXT
      });
      return {
        screen: 'attitudes',
        instruction: 'Please indicate how much you agree or disagree with each statement.',
        anchors: LIKERT7_ANCHORS,
        items
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
          'This research examines how people value different types of personal data under different conditions of use. Some participants were told data would be used for personalization, while others were told it would train generative AI. We are studying whether the purpose of data collection changes how people think about sharing their data.',
          'Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Cole Frank at colefran@andrew.cmu.edu.',
          'IRB Protocol: [Number pending] — Carnegie Mellon University'
        ]
      };
    }

    default:
      return { screen: screenId };
  }
}

function progressFor(screenId, participant) {
  // 13-step display: consent, scenario_intro, data_type_intro, comprehension, scn1, scn2, scn3, supp, comp, ai, attitudes, demo, debrief
  const order = ['consent', 'scenario_intro', 'data_type_intro', 'comprehension'];
  for (const n of participant.scenario_order) order.push(`scenario_${n}`);
  order.push('supplementary', 'compensation', 'ai_usage', 'attitudes', 'demographics', 'debrief');
  const idx = order.indexOf(screenId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

module.exports = { screenPayload, progressFor };
