// All content shown to participants. Server-side only — clients never see codes.
//
// Per data type:
//   `inline` — short mid-sentence name ("demographic information")
//   `data_type_description` — fuller phrase for the intro first sentence
//     ("demographic information, including their age, …")
//   `category` — internal grouping; never sent to clients.
// Types 2–16 still use a stub description (= inline) until their copy is finalized.
const DATA_TYPES = [
  { id: 1,  inline: 'demographic information',
    data_type_description: 'demographic information, including their age, gender, race, zip code, marital status, income, and level of education',
    category: 'Demographic/Identity' },
  { id: 2,  inline: 'Social Security number',
    data_type_description: 'Social Security number',
    category: 'Demographic/Identity' },
  { id: 3,  inline: 'fingerprint and voice recording data',
    data_type_description: 'fingerprint and voice recording data',
    category: 'Demographic/Identity' },
  { id: 4,  inline: 'health information',
    data_type_description: 'health information',
    category: 'Sensitive Personal' },
  { id: 5,  inline: 'financial information',
    data_type_description: 'financial information',
    category: 'Sensitive Personal' },
  { id: 6,  inline: 'password and login credential data',
    data_type_description: 'password and login credential data',
    category: 'Sensitive Personal' },
  { id: 7,  inline: 'text message and email content',
    data_type_description: 'text message and email content',
    category: 'Relational/Communicative' },
  { id: 8,  inline: 'contact information of friends and family',
    data_type_description: 'contact information of friends and family',
    category: 'Relational/Communicative' },
  { id: 9,  inline: 'location history',
    data_type_description: 'location history',
    category: 'Behavioral/Preference' },
  { id: 10, inline: 'browsing and search history',
    data_type_description: 'browsing and search history',
    category: 'Behavioral/Preference' },
  { id: 11, inline: 'shopping and purchase history',
    data_type_description: 'shopping and purchase history',
    category: 'Behavioral/Preference' },
  { id: 12, inline: 'document, note, and report data',
    data_type_description: 'document, note, and report data',
    category: 'Expressive' },
  { id: 13, inline: 'photo and video data',
    data_type_description: 'photo and video data',
    category: 'Expressive' },
  { id: 14, inline: 'email triage behavior',
    data_type_description: 'email triage behavior',
    category: 'Process' },
  { id: 15, inline: 'search and decision trajectory data',
    data_type_description: 'search and decision trajectory data',
    category: 'Process' },
  { id: 16, inline: 'writing and editing process',
    data_type_description: 'writing and editing process',
    category: 'Process' }
];

const USE_CASES = {
  B1: {
    code: 'B1',
    // Infinitive phrase after "to …" (comprehension, scenarios, post-scenario, Block B).
    comp_use: "improve App Z's services",
    scenario_use: "improve App Z's services",
    data_use: "improve App Z's services",
    // Framing shown on the intro screen (dt = assigned data type).
    intro_sentences: (dt) => `App Z would like to collect your ${dt.inline}. This information will be used to improve App Z's services.`
  },
  B2: {
    code: 'B2',
    comp_use: "train App Z's AI models and AI agents to improve its services",
    scenario_use: "train App Z's AI models and AI agents to improve its services",
    data_use: "train App Z's AI models and AI agents to improve its services",
    intro_sentences: (dt) => `App Z would like to collect your ${dt.inline}. This information will be used to train App Z's AI models and AI agents to improve its services.`
  }
};

// Scenario 1 (Subscription Discount) tiers — multi-select ("select all discounts
// you'd accept"). Values stored in s1_accepted_discounts (TEXT[]).
const S1_TIERS = [
  { value: '1off',  label: '$1 off / month ($19/mo)' },
  { value: '3off',  label: '$3 off / month ($17/mo)' },
  { value: '5off',  label: '$5 off / month ($15/mo)' },
  { value: '8off',  label: '$8 off / month ($12/mo)' },
  { value: '12off', label: '$12 off / month ($8/mo)' },
  { value: '20off', label: '$20 off / month (Free)' }
];

// Scenario 2 (Data Sharing Program) revenue-share tiers — multi-select ("select all
// percentages you'd accept"). Values stored in s2_accepted_shares (TEXT[]).
const S2_TIERS = [
  { value: '1',  label: '1%' },
  { value: '10', label: '10%' },
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '99', label: '99%' }
];

// Post-scenario questions: Block B (about compensation for the use case, shown first) + Block A
// (about the data type) + one attention check (randomized into Block A). Block B is randomized
// within itself (block_b_order), then Block A (block_a_order); each shown on its own screen.
// `key` doubles as the DB column name. `prompt(dt, uc)` builds the
// text with the assigned data type / use case substituted in.
//   type: 'likert5'    → 1-5 radio with anchors, stored SMALLINT
//         'choice'     → radio list of {value,label}, stored TEXT
//         'choice_num' → radio list with numeric values, stored SMALLINT
//         'multiselect'→ checkboxes (check all), stored TEXT[]
//         'attention'  → 1-5 radio like likert5; stores value + pass (value === expected)
const YESNO_UNSURE = [
  { value: 'yes',    label: 'Yes' },
  { value: 'no',     label: 'No' },
  { value: 'unsure', label: 'Unsure' }
];

const POST_QUESTIONS = [
  // ----- Block A: about the data type -----
  { id: 1, key: 'postq_importance', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you consider ${dt.inline} to be important?`,
    anchors: { low: 'not important to me at all', high: 'extremely important to me' } },
  { id: 2, key: 'postq_sensitivity', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you consider ${dt.inline} to be sensitive?`,
    anchors: { low: 'not sensitive at all', high: 'extremely sensitive' } },
  { id: 3, key: 'postq_ownership', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you feel ownership over ${dt.inline}?`,
    anchors: { low: 'I do not feel ownership over this type of data', high: 'I feel strong ownership over it' } },
  { id: 4, key: 'postq_share_public', block: 'A', type: 'choice_num',
    prompt: (dt) => `Would you ever share your ${dt.inline} publicly – for example with a room of people you have never met before? Choose the option that best describes how far you'd be willing to go:`,
    options: [
      { value: 0, label: 'No — I would never share it publicly.' },
      { value: 1, label: 'Maybe — it would depend on the situation.' },
      { value: 2, label: 'Yes, but only without my name attached (anonymously).' },
      { value: 3, label: 'Yes, including with my name attached.' }
    ] },
  { id: 5, key: 'postq_buy_sell_appropriate', block: 'A', type: 'likert5',
    prompt: (dt) => `Is it appropriate to buy and sell your ${dt.inline}?`,
    anchors: { low: 'Completely inappropriate', high: 'Completely appropriate' } },
  { id: 6, key: 'postq_upset_if_leaked', block: 'A', type: 'likert5',
    prompt: (dt) => `If you found out your ${dt.inline} had been released publicly without your knowledge, how upset would you be?`,
    anchors: { low: 'not at all', high: 'Extremely' } },

  // ----- Block B: about compensation for the use case. The use-case context
  // ("Suppose App Z collects your <data> to <use>") is shown as a per-screen
  // header, so these prompts are trimmed to just the question. -----
  { id: 7, key: 'postq_comp_by_amount', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: () => 'Should you be compensated based on how much of your data was used?' },
  { id: 8, key: 'postq_comp_per_use', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: () => 'Should you be compensated each time your data is used?' },
  { id: 9, key: 'postq_comp_by_effort', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: () => 'Should you be compensated based on how hard it was to generate this data?' },
  { id: 10, key: 'postq_comp_by_originality', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: () => "Should you be compensated for how original your data is relative to others'?" },
  { id: 11, key: 'postq_coworker_sells_feel', block: 'B', type: 'choice',
    prompt: () => 'Suppose a coworker got hold of this data and sold it to another company for the same use. How would you feel?',
    options: [
      { value: 'very_upset',   label: 'Very upset' },
      { value: 'little_upset', label: 'A little upset' },
      { value: 'confused',     label: 'Confused' },
      { value: 'dont_care',    label: "Don't care at all" },
      { value: 'happy',        label: 'Happy for them' }
    ] },
  { id: 12, key: 'postq_credit_ack', block: 'B', type: 'likert5',
    prompt: () => 'Should you receive credit or acknowledgement for this data when it is used?',
    anchors: { low: 'Not at all', high: 'Completely' } },
  { id: 13, key: 'postq_concerns', block: 'B', type: 'multiselect',
    prompt: () => 'What is/are your main concern(s) about sharing this data? (Please check all that apply)',
    options: [
      { value: 'not_concerned', label: "I'm not concerned" },
      { value: 'too_personal',  label: "It's too personal or sensitive" },
      { value: 'manipulate',    label: 'It could be used to manipulate me' },
      { value: 'impersonate',   label: 'It could be used to impersonate or represent me' },
      { value: 'no_trust',      label: "I don't trust the company to protect it" },
      { value: 'not_sure',      label: "I'm not sure" }
    ] },

  // ----- Attention check (pooled + randomized with A1–B7) -----
  { id: 14, key: 'attention_check', block: 'AC', type: 'attention', expected: 1,
    prompt: () => "This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all' (1).",
    anchors: { low: 'not important to me at all', high: 'extremely important to me' } }
];

const ATTENTION_CHECK_EXPECTED = 1; // instructed-response value for the pooled attention check

// Screen 21: AI Usage & Literacy — five questions on one screen (fixed order).
const FREQ_OPTIONS = [
  { value: 'multiple_daily',  label: 'More than once a day' },
  { value: 'daily',           label: 'Daily' },
  { value: 'few_weekly',      label: 'A few times a week' },
  { value: 'weekly',          label: 'Weekly' },
  { value: 'weekly_monthly',  label: 'Between weekly and monthly' },
  { value: 'tried',           label: 'Tried once or twice' },
  { value: 'never',           label: 'Never' }
];
const YESNO_PNA = [
  { value: 'yes', label: 'Yes' },
  { value: 'no',  label: 'No' },
  { value: 'pna', label: 'Prefer not to answer' }
];
const AI_LITERACY_QUESTIONS = [
  { key: 'ai_tools_freq', options: FREQ_OPTIONS,
    prompt: 'How often do you use AI tools (where AI is the core feature), such as AI chatbots, AI email composition, AI writing assistants, AI schedulers, or AI image generators?' },
  { key: 'social_media_freq', options: FREQ_OPTIONS,
    prompt: 'How often do you use social media apps, like Instagram, Facebook, TikTok, Reddit, Snapchat, Retro, and others?' },
  { key: 'search_engine_freq', options: FREQ_OPTIONS,
    prompt: 'How often do you use search engines, like Google, Bing, DuckDuckGo, Baidu, Ecosia, and Yahoo search?' },
  { key: 'tech_current', options: YESNO_PNA,
    prompt: 'Do you currently work in the technology sector?' },
  { key: 'tech_ever', options: YESNO_PNA,
    prompt: 'Have you ever worked in the technology sector?' }
];

// Demographics — fixed order. Age, gender, education only.
const DEMOGRAPHICS = [
  { key: 'age_band', prompt: 'Age', options: [
    { value: '18-24', label: '18–24' },
    { value: '25-34', label: '25–34' },
    { value: '35-44', label: '35–44' },
    { value: '45-54', label: '45–54' },
    { value: '55-64', label: '55–64' },
    { value: '65+',   label: '65+' },
    { value: 'pna',   label: 'Prefer not to answer' }
  ]},
  { key: 'gender', prompt: 'Gender', options: [
    { value: 'man',        label: 'Man' },
    { value: 'woman',      label: 'Woman' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'other',      label: 'Other', has_other: true },
    { value: 'pna',        label: 'Prefer not to answer' }
  ]},
  { key: 'education', prompt: 'Education', options: [
    { value: 'less_hs',   label: 'Less than high school' },
    { value: 'hs',        label: 'High school' },
    { value: 'some_col',  label: 'Some college' },
    { value: 'bachelors', label: "Bachelor's degree" },
    { value: 'graduate',  label: 'Graduate degree' },
    { value: 'pna',       label: 'Prefer not to answer' }
  ]}
];

// Open-ended response — its own screen, after the post-scenario battery and
// before AI usage. `key` doubles as the DB column. Optional free text.
const OPEN_RESPONSE = {
  key: 'open_data_revenue',
  prompt: 'A lot of companies rely on user data. Sometimes, selling user data is a major revenue stream. Or user data may be critical to their main product so that their revenue stream indirectly depends on user data. How do you feel about your online data being a source of revenue for companies? Does your answer change if your data is being used to train AI tools?'
};

// Ordered list of screen IDs. `__scenarios__` expands per participant (scenario_order, with a
// scenario_transition between); `__block_b__` / `__block_a__` expand via block_b_order / block_a_order.
const SCREEN_FLOW = [
  'consent',
  'welcome',
  'intro',
  '__scenarios__',
  'post_scenario_intro',
  '__block_b__',
  '__block_a__',
  'open_response',
  'ai_usage',
  'demographics',
  'debrief'
];

module.exports = {
  DATA_TYPES,
  USE_CASES,
  S1_TIERS,
  S2_TIERS,
  POST_QUESTIONS,
  ATTENTION_CHECK_EXPECTED,
  OPEN_RESPONSE,
  AI_LITERACY_QUESTIONS,
  DEMOGRAPHICS,
  SCREEN_FLOW
};
