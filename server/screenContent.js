// Build the JSON payload sent to the client for each screen.
// CRITICAL: never send raw condition codes (data_type number, use_case code) — only rendered strings.

const {
  DATA_TYPES, USE_CASES, S1_TIERS, S2_TIERS,
  POST_QUESTIONS, OPEN_RESPONSE, AI_LITERACY_QUESTIONS, DEMOGRAPHICS
} = require('./content');

function getDataType(p) {
  return DATA_TYPES.find(d => d.id === p.data_type);
}

function getUseCase(p) {
  return USE_CASES[p.use_case];
}

// The two scenarios share one voice-neutral, first-person design: a bold lead-in,
// a settings-page frame (heading + program description), and a multi-select
// question below the frame. `collect_emphasis` marks the data type for bold+underline;
// the offer line is highlighted client-side. Voice (?voice=appx) no longer changes copy.
function scenarioPayload(p, screenId) {
  const dt = getDataType(p);
  const uc = getUseCase(p);
  const common = {
    intro_default: 'By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.',
    collect_line: `We will collect your ${dt.inline}`,
    collect_emphasis: [dt.inline],
    use_line: `We will use this information to ${uc.scenario_use}`
  };
  if (screenId === 'scenario_1') {
    return Object.assign({
      screen: 'scenario_1',
      lead_in: ['Imagine App Z offers you the option to receive a Subscription Discount:'],
      frame_url: 'appz.com/settings/subscription',
      sidebar_active: 'subscription',
      heading: 'Subscription',
      intro: [
        'You currently pay $20 per month for our app.',
        common.intro_default,
        'We are now offering you the option to receive a Subscription Discount. If you agree:'
      ],
      offer_line: 'We would like to offer you a monthly discount on your subscription for sharing this data.',
      question: 'Please select what discount you would be willing to accept (select all that apply):',
      tiers: S1_TIERS,
      none_label: 'I would not accept any discount',
      submit: { accepted: 's1_accepted_discounts', none: 's1_none' }
    }, common);
  }
  return Object.assign({
    screen: 'scenario_2',
    lead_in: ["We'd like you to imagine…", '… One day, you open App Z and it offers you the option to join a Data Sharing Program:'],
    frame_url: 'appz.com/settings/data-sharing',
    sidebar_active: 'data_sharing',
    heading: 'Data Sharing Program',
    intro: [
      'You currently pay $20 per month for our app.',
      common.intro_default,
      'We are now offering you the option to join a Data Sharing Program. If you opt in:'
    ],
    offer_line: 'Because your data will increase our revenue, we would like to offer to pay you a percentage of the revenue attributed to your data for sharing this data.',
    question: 'Please select what percentages you would be willing to accept (select all that apply):',
    tiers: S2_TIERS,
    none_label: 'I would not agree to this program',
    submit: { accepted: 's2_accepted_shares', none: 's2_none' }
  }, common);
}

// Payload for a single post-scenario question screen (postq_<id>). The attention
// check renders exactly like a likert5 item — its instruction lives in the prompt.
function postQuestionPayload(p, screenId) {
  const dt = getDataType(p);
  const uc = getUseCase(p);
  const qid = parseInt(screenId.split('_')[1], 10);
  const q = POST_QUESTIONS.find(x => x.id === qid);
  const item = { id: q.id, key: q.key, type: q.type, prompt: q.prompt(dt, uc) };
  // Block B screens carry a use-case context header; Block A (and the attention
  // check) show only the question.
  if (q.block === 'B') {
    item.header = `Suppose App Z collects your ${dt.inline} for ${uc.data_use}`;
  }
  if (q.type === 'likert5' || q.type === 'attention') {
    item.anchors = q.anchors;
  } else {
    item.options = q.options.map(o => ({ value: o.value, label: o.label }));
  }
  return {
    screen: screenId,
    kind: 'post_question',
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

    case 'intro': {
      // Single screen: App Z setup → the "recent change" (data type + longer
      // definition inline + per-condition use case) → comprehension check.
      const longDef = dt.learn_more;
      const defInline = longDef.charAt(0).toLowerCase() + longDef.slice(1);
      return {
        screen: 'intro',
        setup: [
          "Imagine you're a frequent user of App Z!",
          'App Z is an online service that you use often.',
          'You currently pay $20 per month for App Z.',
          'By default, App Z does not record or store any of your information beyond what is strictly necessary to operate the service.',
          'App Z does not sell your information, and App Z also deletes any data it holds after one year.'
        ],
        change_heading: "But there's been a recent change.",
        change: [
          `Earlier this year, App Z became interested in collecting the ${dt.label} of its users.`,
          `By ${dt.label}, we mean ${defInline}`,
          uc.intro_sentences(dt)
        ],
        // Phrases the client bolds + underlines inline within the setup/change paragraphs.
        emphasis: [
          '$20 per month',
          'does not record or store',
          'does not sell',
          'deletes',
          'after one year',
          dt.label,
          `to ${uc.comp_use}`
        ],
        comprehension: {
          instruction: 'Based on the information above, indicate whether each statement is True or False.',
          statements: [
            { id: 1, text: `The data you would share with App Z is: ${dt.definition}.` },
            { id: 2, text: `App Z would use your data to ${uc.comp_use}.` },
            { id: 3, text: 'App Z guarantees that your data will be permanently deleted after 30 days.' }
          ]
        }
      };
    }

    case 'scenario_1':
    case 'scenario_2':
      return scenarioPayload(p, screenId);

    case 'scenario_transition': {
      return {
        screen: 'scenario_transition',
        body: ["Now we'd like you to imagine that App Z took a different approach."],
        button: 'See this approach on the next page'
      };
    }

    case 'post_scenario_intro': {
      return {
        screen: 'post_scenario_intro',
        body: [
          `Now, we'd like to understand how you feel about App Z collecting your ${dt.inline} for ${uc.data_use}.`,
          "On the following pages, we'll ask you a series of questions."
        ]
      };
    }

    case 'open_response': {
      return {
        screen: 'open_response',
        prompt: OPEN_RESPONSE.prompt,
        field: OPEN_RESPONSE.key
      };
    }

    case 'about_you_intro': {
      return {
        screen: 'about_you_intro',
        body: ['In the last part of this survey, we have a few questions about you.'],
        button: 'Next'
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
          'The "App Z" service in this survey was hypothetical. No company called App Z collected any of your information, and your responses to the scenarios will not be shared with any third party.',
          'Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Sarah Cen at sarahcen@andrew.cmu.edu.',
          'IRB Protocol: STUDY2026_00000225 — Carnegie Mellon University'
        ]
      };
    }

    default:
      return { screen: screenId };
  }
}

function progressFor(screenId, participant) {
  const order = ['consent', 'welcome', 'intro'];
  order.push(`scenario_${participant.scenario_order[0]}`, 'scenario_transition', `scenario_${participant.scenario_order[1]}`);
  order.push('post_scenario_intro');
  for (const qid of participant.block_b_order) order.push(`postq_${qid}`);
  for (const qid of participant.block_a_order) order.push(`postq_${qid}`);
  order.push('open_response', 'about_you_intro', 'ai_usage', 'demographics', 'debrief');
  const idx = order.indexOf(screenId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

module.exports = { screenPayload, progressFor };
