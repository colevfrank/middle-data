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
      return {
        screen: 'scenario_1',
        prompt: `AppX offers you a discount on your $20/month subscription if you agree to share your ${dt.inline} to ${uc.verbatim}.`,
        instruction: 'For each discount amount below, would you share your data?',
        tiers: S1_TIERS,
        none_label: 'I would not share at any price'
      };
    }

    case 'scenario_2': {
      return {
        screen: 'scenario_2',
        reminder: `Reminder: AppX would use your ${dt.inline} to ${uc.verbatim}.`,
        intro: `Instead of a discount, AppX offers you an additional feature in exchange for sharing your ${dt.inline}.`,
        feature: 'The feature is: Premium features — priority access to new features, additional storage, and an ad-free experience.',
        prompt: `Would you share your ${dt.inline} in exchange for this feature?`,
        options: [
          { value: 'yes',      label: 'Yes' },
          { value: 'no',       label: 'No' },
          { value: 'not_sure', label: 'Not sure' }
        ]
      };
    }

    case 'scenario_3': {
      return {
        screen: 'scenario_3',
        intro: 'Now imagine a different arrangement.',
        setup: [
          `You pay $20 per month for AppX. By default, AppX does not record, store, or sell your ${dt.inline}.`,
          'AppX offers you the option to join a data marketplace program. If you opt in:',
          `AppX will sell your ${dt.inline} to third-party companies on your behalf.`,
          'You will receive a percentage of the selling price back as a discount on your monthly subscription.',
          'You can opt out at any time, but data that has already been sold cannot be taken back.'
        ],
        instruction: 'For each revenue share below, would you participate?',
        tiers: S3_TIERS,
        none_label: 'I would not participate at any revenue share',
        followup_prompt: 'What is the main reason you chose not to participate?',
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
