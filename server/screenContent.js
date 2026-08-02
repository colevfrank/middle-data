// Build the JSON payload sent to the client for each screen.
// CRITICAL: never send raw condition codes (data_type number, use_case code) — only rendered strings.

const {
  DATA_TYPES, USE_CASES, S1_TIERS, S2_TIERS,
  POST_QUESTIONS, OPEN_RESPONSE, AI_LITERACY_QUESTIONS, DEMOGRAPHICS,
  forBlockB
} = require('./content');
const { shuffle } = require('./randomization');

function getDataType(p) {
  return DATA_TYPES.find(d => d.id === p.data_type);
}

function getUseCase(p) {
  return USE_CASES[p.use_case];
}

// Examples clause from the intro description (text after ", including ").
function dataTypeExamples(dt) {
  const d = dt.data_type_description;
  const marker = ', including ';
  const i = d.indexOf(marker);
  if (i < 0) return '';
  return d.slice(i + marker.length).replace(/\.$/, '');
}

// Rewrite third-person example copy for "your …" contexts (Blocks A/B, scenarios).
// Intro narrative keeps the original "users/their" wording.
function examplesAsYours(text) {
  return text
    .replace(/\ba user's\b/g, 'your')
    .replace(/\busers'\b/g, 'your')
    .replace(/\btheir\b/g, 'your')
    .replace(/\bthey\b/g, 'you')
    .replace(/\busers\b/g, 'you');
}

function examplesForYou(dt) {
  return examplesAsYours(dataTypeExamples(dt) || dt.inline);
}

// Block A reminder, e.g. "Financial information includes…" / "…documents include…".
function dataTypeIncludesHeader(dt) {
  const examples = examplesForYou(dt);
  const name = dt.inline.charAt(0).toUpperCase() + dt.inline.slice(1);
  const verb = dt.plural ? 'include' : 'includes';
  return `${name} ${verb} ${examples}.`;
}

// Block B / scenario reminder (avoids repeating the data-type name).
function thisIncludesSentence(dt) {
  return `This includes ${examplesForYou(dt)}.`;
}

// The two scenarios share one voice-neutral, first-person design: a bold lead-in,
// a settings-page frame (heading + program description), and a multi-select
// question below the frame. `collect_emphasis` marks the data type for bold+underline;
// the offer line is highlighted client-side. Voice (?voice=appx) no longer changes copy.
function scenarioPayload(p, screenId) {
  const dt = getDataType(p);
  const uc = getUseCase(p);
  const common = {
    intro: [
      'You currently pay $20 per month for our app. By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.'
    ],
    collect_line: `We will access or ask you to provide your ${dt.inline}. ${thisIncludesSentence(dt)}`,
    collect_emphasis: [dt.inline],
    use_line: `We will use this information to ${uc.scenario_use}`,
    use_emphasis: [uc.scenario_use]
  };
  if (screenId === 'scenario_1') {
    return Object.assign({
      screen: 'scenario_1',
      lead_in: [
        "We'd like you to imagine: You open App Z and it offers you the option to receive a Subscription Discount"
      ],
      frame_url: 'appz.com/settings/subscription',
      sidebar_active: 'subscription',
      heading: 'Subscription',
      intro_offer: 'We are now offering you the option to receive a Subscription Discount. If you agree:',
      offer_line: 'We would like to offer you a monthly discount on your subscription for sharing this data.',
      // Decorative settings-UI mock (not the participant response).
      offer_agree: {
        checkbox_label: 'I agree',
        disagree_label: 'I do not agree',
        blank_prefix: '$',
        blank_suffix: ' / month discount',
        blank_placeholder: ''
      },
      question: 'Please select what discount you would be willing to accept (select all that apply):',
      tiers: S1_TIERS,
      none_label: 'I will not share this data regardless of the discount amount',
      submit: { accepted: 's1_accepted_discounts', none: 's1_none' }
    }, common);
  }
  return Object.assign({
    screen: 'scenario_2',
    lead_in: [
      "We'd like you to imagine: You open App Z and it offers you the option to join a Data Sharing Program"
    ],
    frame_url: 'appz.com/settings/data-sharing',
    sidebar_active: 'data_sharing',
    heading: 'Data Sharing Program',
    intro_offer: 'We are now offering you the option to join a Data Sharing Program. If you opt in:',
    offer_line: 'Because your data will increase our revenue, we would like to offer to pay you a percentage of the revenue attributed to your data for sharing this data.',
    offer_agree: {
      checkbox_label: 'I agree',
      disagree_label: 'I do not agree',
      blank_prefix: '',
      blank_suffix: '% of revenue',
      blank_placeholder: ''
    },
    question: 'Please select which percentages of the revenue attributed to your data you would be willing to accept (select all that apply):',
    tiers: S2_TIERS,
    none_label: 'I will not share this data regardless of the percentage',
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
  // Blocks A/B may use alternate short names (inline_b); attention check unchanged.
  const dtForPrompt = (q.block === 'A' || q.block === 'B') ? forBlockB(dt) : dt;
  const item = { id: q.id, key: q.key, type: q.type, prompt: q.prompt(dtForPrompt, uc) };
  if (q.prompt_emphasis) item.prompt_emphasis = q.prompt_emphasis;
  // Block B: use-case context. Block A: data-type description reminder.
  // Attention check: no header.
  if (q.block === 'B') {
    // Short name + use, then "This includes …".
    // Some items: "wants to collect" (hypothetical intent); others: "collects".
    const wantsToCollect = q.key === 'postq_coworker_sells_feel'
      || q.key === 'postq_concerns';
    const verb = wantsToCollect ? 'wants to collect' : 'collects';
    // No comma before "to …" — the includes clause is a separate sentence.
    item.header = `Suppose App Z ${verb} your ${dtForPrompt.inline} to ${uc.data_use}. ${thisIncludesSentence(dt)}`;
  } else if (q.block === 'A') {
    item.header = dataTypeIncludesHeader(dtForPrompt);
  }
  if (q.type === 'likert5' || q.type === 'attention') {
    item.anchors = q.anchors;
  } else {
    let options = q.options.map(o => ({
      value: o.value,
      label: o.label,
      has_other: !!o.has_other
    }));
    // Concerns (multiselect): randomize order; Other always last.
    if (q.type === 'multiselect') {
      const other = options.filter(o => o.has_other);
      const rest = shuffle(options.filter(o => !o.has_other));
      options = rest.concat(other);
    }
    item.options = options;
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
        heading: 'Welcome!',
        body: [
          "In the following pages, you'll answer some questions. Then, you'll be redirected back to CloudResearch once you complete the survey.",
          'Once you advance, you will not be able to return to previous pages, so please consider each question carefully before clicking next.',
          'Click "Continue" when you are ready to begin.'
        ]
      };
    }

    case 'intro': {
      return {
        screen: 'intro',
        setup: [
          "Imagine you're a frequent user of App Z!",
          'App Z is an online service that you use often. You currently pay $20 per month for App Z.',
          'By default, App Z does not record or store any of your information beyond what is strictly necessary to operate the service. App Z does not sell your information, and App Z also deletes any data it holds after one year.'
        ],
        change_heading: 'But there has been a recent change',
        change: [
          `Earlier this year, App Z became interested in ${dt.data_type_description}.`,
          uc.intro_sentences(dt)
        ],
        // Bold+underline the core data-type phrase (before ", including …"),
        // e.g. "how its users cook" or "users' financial information".
        data_type_bold: (() => {
          const core = dt.data_type_description.split(', including ')[0];
          return core.startsWith('its ') ? core.slice(4) : core;
        })(),
        // Phrases bold+underlined in setup; `access_line` is the full intro
        // sentence (second change para) styled separately as bold+underline.
        access_line: uc.intro_sentences(dt),
        emphasis: [
          '$20 per month',
          'does not record or store',
          'does not sell',
          'deletes',
          'after one year'
        ],
        comprehension: {
          instruction: '',
          statements: [
            { id: 1, text: `App Z would like to access its users' ${dt.inline}.` },
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
        heading: "Now we'd like you to imagine that App Z took a different approach.",
        body: [],
        button: 'See this approach on the next page'
      };
    }

    case 'post_scenario_intro': {
      return {
        screen: 'post_scenario_intro',
        body: [
          `Now, we'd like to understand how you feel about App Z accessing your ${dt.inline} to ${uc.data_use}.`,
          "On the following pages, we'll ask you a series of questions."
        ]
      };
    }

    case 'block_a_intro': {
      const dtA = forBlockB(dt);
      const itsTheir = dtA.plural ? 'their' : 'its';
      return {
        screen: 'block_a_intro',
        body: [
          `Now, we'd like to understand how you feel about ${dtA.inline}, regardless of ${itsTheir} use.`,
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
          'The purpose of this study is to understand how people value different types of personal data, and whether their preferences change depending on what the data will be used for—particularly when it is used to train AI models or AI agents versus to improve a company\'s services more generally.',
          'The "App Z" service in this survey was hypothetical. No company called App Z accessed or collected any of your information, and your responses to the scenarios will not be shared with any third party.',
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
  order.push('block_a_intro');
  for (const qid of participant.block_a_order) order.push(`postq_${qid}`);
  order.push('open_response', 'about_you_intro', 'ai_usage', 'demographics', 'debrief');
  const idx = order.indexOf(screenId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

module.exports = { screenPayload, progressFor };
