// All content shown to participants. Server-side only — clients never see codes.
//
// Per data type:
//   `inline` — short mid-sentence name (intro, scenarios, Block A, …)
//   `inline_b` — optional Block A/B short name (falls back to `inline`; intro/scenarios keep `inline`)
//   `plural` / `plural_b` — grammatical number for is/are and it/them
//   `data_type_description` — fuller phrase for the intro first sentence
//   `category` — internal grouping; never sent to clients.
// Source of truth for participant-facing copy: SURVEY_PAGES.md

const DATA_TYPES = [
  { id: 1,  inline: 'demographic information', plural: false,
    data_type_description: "its users' demographic information, including their age, gender, race, zip code, marital status, income, and level of education",
    category: 'Demographic/Identity' },
  { id: 2,  inline: 'government IDs', plural: true,
    inline_b: 'government ID data', plural_b: false,
    data_type_description: "its users' government IDs, including their driver's license or passport information",
    category: 'Demographic/Identity' },
  { id: 3,  inline: 'voice data', plural: false,
    data_type_description: "its users' voice data, including voice notes, recordings, and voice-to-text commands",
    category: 'Demographic/Identity' },
  { id: 4,  inline: 'health information and medical records', plural: true,
    data_type_description: "its users' health information and medical records, including doctors' visit notes, test results, prescribed medication, and vaccination history",
    category: 'Sensitive Personal' },
  { id: 5,  inline: 'financial information', plural: false,
    data_type_description: "its users' financial information, including bank statements and investment portfolios",
    category: 'Sensitive Personal' },
  { id: 6,  inline: 'communications', plural: true,
    inline_b: 'communications data', plural_b: false,
    data_type_description: "its users' communications, including text messages, social media messages, and emails",
    category: 'Relational/Communicative' },
  { id: 7,  inline: 'social network', plural: false,
    inline_b: 'social network data',
    data_type_description: "its users' social network, including the names of friends, coworkers, and family members",
    category: 'Relational/Communicative' },
  { id: 8,  inline: 'contacts', plural: true,
    inline_b: 'contacts data', plural_b: false,
    data_type_description: "its users' contacts, including the names, emails, and phone numbers of contacts on a user's device",
    category: 'Relational/Communicative' },
  { id: 9,  inline: 'location history', plural: false,
    inline_b: 'location history data',
    data_type_description: "its users' location history, including where users go and at what times",
    category: 'Behavioral/Preference' },
  { id: 10, inline: 'web browsing history', plural: false,
    inline_b: 'web browsing history data',
    data_type_description: "its users' web browsing history, including websites users visit and the timestamps of each visit",
    category: 'Behavioral/Preference' },
  { id: 11, inline: 'purchase history', plural: false,
    inline_b: 'purchase history data',
    data_type_description: "its users' purchase history, including what users purchase from which vendors and at what times",
    category: 'Behavioral/Preference' },
  { id: 12, inline: 'professional or educational documents', plural: true,
    data_type_description: "its users' professional or educational documents, including notes, essays, and reports used for work or education but not including financial, government, or otherwise sensitive documents",
    category: 'Expressive' },
  { id: 13, inline: 'photo library', plural: false,
    inline_b: 'photo library data',
    data_type_description: "its users' photo library, including photo or video data stored on their device",
    category: 'Expressive' },
  { id: 14, inline: 'email management behavior data', plural: false,
    data_type_description: 'how its users manage their emails, including detailed behavioral data of how users respond, sort, delete, and search their email',
    category: 'Process' },
  { id: 15, inline: 'administrative task behavior data', plural: false,
    data_type_description: 'how its users perform basic administrative tasks, including detailed behavioral data of how users book flights, pay bills, search for restaurants, or plan a party',
    category: 'Process' },
  { id: 16, inline: 'cooking behavior data', plural: false,
    data_type_description: 'how its users cook, including detailed behavioral data of what users cook, what ingredients they use, whether they follow recipes, and how long they spend cooking',
    category: 'Process' },
  { id: 17, inline: 'music preferences', plural: true,
    inline_b: 'music preferences data', plural_b: false,
    data_type_description: "its users' music preferences, including the songs and artists users listen to as well as users' rating, like, and skip behaviors",
    category: 'Behavioral/Preference' },
  { id: 18, inline: 'streaming preferences', plural: true,
    inline_b: 'streaming preferences data', plural_b: false,
    data_type_description: "its users' streaming preferences, including the shows and movies users watch, whether users finish each video, and how users rate the videos",
    category: 'Behavioral/Preference' },
  { id: 19, inline: 'screen usage data', plural: false,
    data_type_description: "its users' screen usage, including when and how long users open their devices and use each application",
    category: 'Behavioral/Preference' },
  { id: 20, inline: 'exercise activities data', plural: false,
    data_type_description: "its users' exercise activities, including what forms of exercise users engage in and when they exercise",
    category: 'Behavioral/Preference' }
];

function be(dt) { return dt.plural ? 'are' : 'is'; }
function itThem(dt) { return dt.plural ? 'them' : 'it'; }
function theyIt(dt) { return dt.plural ? 'they' : 'it'; }

// View of a data type for Block A/B prompts/headers (uses inline_b when set).
function forBlockB(dt) {
  return Object.assign({}, dt, {
    inline: dt.inline_b || dt.inline,
    plural: dt.plural_b !== undefined ? dt.plural_b : dt.plural
  });
}

const USE_CASES = {
  B1: {
    code: 'B1',
    // Infinitive phrase after "to …"
    comp_use: "improve App Z's services",
    scenario_use: "improve App Z's services",
    data_use: "improve App Z's services",
    intro_sentences: (dt) => `App Z would like to access your ${dt.inline} to improve App Z's services.`
  },
  B2: {
    code: 'B2',
    comp_use: "train App Z's AI models and AI agents to improve its services",
    scenario_use: "train App Z's AI models and AI agents to improve its services",
    data_use: "train App Z's AI models and AI agents to improve its services",
    intro_sentences: (dt) => `App Z would like to access your ${dt.inline} to train App Z's AI models and AI agents to improve its services.`
  }
};

const S1_TIERS = [
  { value: '1off',  label: '$1 off / month ($19/mo)' },
  { value: '3off',  label: '$3 off / month ($17/mo)' },
  { value: '5off',  label: '$5 off / month ($15/mo)' },
  { value: '8off',  label: '$8 off / month ($12/mo)' },
  { value: '12off', label: '$12 off / month ($8/mo)' },
  { value: '20off', label: '$20 off / month (Free)' }
];

const S2_TIERS = [
  { value: '1',  label: '1%' },
  { value: '10', label: '10%' },
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '99', label: '99%' }
];

const YESNO_UNSURE_CARE = [
  { value: 'yes',       label: 'Yes' },
  { value: 'no',        label: 'No' },
  { value: 'unsure',    label: 'Unsure' },
  { value: 'dont_care', label: "I don't care" }
];

// Post-scenario questions: Block B first, then Block A (+ attention check in A).
// `key` doubles as the DB column name.
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
    prompt: (dt) => `Would you ever share your ${dt.inline} publicly? For example, would you share ${itThem(dt)} with a person or group of people you have never met before? Choose the option that best describes your answer:`,
    options: [
      // Pronoun-neutral so labels work for both singular and plural data types.
      { value: 0, label: 'No — I would never share this publicly.' },
      { value: 1, label: 'Maybe — it would depend on the situation.' },
      { value: 2, label: 'Yes, but only without my name attached (anonymously).' },
      { value: 3, label: 'Yes, including with my name attached.' }
    ] },
  { id: 5, key: 'postq_buy_sell_appropriate', block: 'A', type: 'likert5',
    prompt: (dt) => `Is it appropriate to buy and sell your ${dt.inline}?`,
    anchors: { low: 'Completely inappropriate', high: 'Completely appropriate' } },
  { id: 6, key: 'postq_upset_if_leaked', block: 'A', type: 'choice',
    prompt: (dt) => `If you found out your ${dt.inline} had been released publicly without your knowledge, which best describes how you would feel?`,
    options: [
      { value: 'not_upset',           label: 'I would not be upset, whether or not my name was attached.' },
      { value: 'a_little_uncomfortable', label: 'I would be a little uncomfortable.' },
      { value: 'upset_if_named',      label: 'I would be upset only if my name was attached.' },
      { value: 'upset_if_anonymous',  label: 'I would be upset even if the data was released anonymously (without my name).' },
      { value: 'very_upset_either',   label: 'I would be very upset either way.' },
      { value: 'unsure',              label: "I'm not sure." }
    ] },
  { id: 15, key: 'postq_identifiability', block: 'A', type: 'likert5',
    prompt: (dt) => `How identifiable (traceable to you) do you think ${dt.inline} ${be(dt)}?`,
    anchors: { low: 'not identifiable at all', high: 'extremely identifiable' } },
  { id: 16, key: 'postq_usefulness', block: 'A', type: 'likert5',
    prompt: (dt) => `How useful do you think ${dt.inline} ${be(dt)} to companies?`,
    anchors: { low: 'not useful at all', high: 'extremely useful' } },
  { id: 17, key: 'postq_replaceability', block: 'A', type: 'likert5',
    prompt: (dt) => `How common or replaceable do you think ${dt.inline} ${be(dt)} across people? In other words, if you didn't provide ${itThem(dt)}, could someone else easily provide similar data?`,
    anchors: { low: 'unique to me / hard to replace', high: 'very common / easily replaceable' } },
  { id: 18, key: 'postq_control', block: 'A', type: 'likert5',
    prompt: (dt) => `How much control do you feel you have over your ${dt.inline} in general?`,
    anchors: { low: 'no control at all', high: 'complete control' } },

  // ----- Block B: about compensation for the use case -----
  { id: 7, key: 'postq_comp_by_amount', block: 'B', type: 'choice', options: YESNO_UNSURE_CARE,
    prompt: (dt) => `Should you be compensated based on how much of your ${dt.inline} ${be(dt)} used by App Z?`,
    prompt_emphasis: ['how much'] },
  { id: 8, key: 'postq_comp_per_use', block: 'B', type: 'choice', options: YESNO_UNSURE_CARE,
    prompt: (dt) => `Should you be compensated each time your ${dt.inline} ${be(dt)} used by App Z?` },
  { id: 9, key: 'postq_comp_by_effort', block: 'B', type: 'choice', options: YESNO_UNSURE_CARE,
    prompt: (dt) => `Should you be compensated based on how much effort it took for you to generate or provide your ${dt.inline} to App Z?`,
    prompt_emphasis: ['how much effort'] },
  { id: 10, key: 'postq_comp_by_originality', block: 'B', type: 'choice', options: YESNO_UNSURE_CARE,
    prompt: (dt) => `Should you be compensated for how unique or original your ${dt.inline} ${be(dt)} relative to others' on App Z?`,
    prompt_emphasis: ['how unique or original'] },
  { id: 11, key: 'postq_coworker_sells_feel', block: 'B', type: 'choice',
    prompt: (dt) => `Suppose your phone manufacturer collected your ${dt.inline} and sold ${itThem(dt)} to App Z. How would you feel?`,
    options: [
      { value: 'very_upset',   label: 'Very upset' },
      { value: 'little_upset', label: 'A little upset' },
      { value: 'confused',     label: 'Confused' },
      { value: 'dont_care',    label: "Don't care at all" },
      { value: 'happy',        label: 'Happy for them' }
    ] },
  { id: 12, key: 'postq_credit_ack', block: 'B', type: 'choice_num',
    prompt: (dt) => `Should you receive credit or acknowledgement for your ${dt.inline} when ${theyIt(dt)} ${be(dt)} used by App Z?`,
    prompt_emphasis: ['credit or acknowledgement'],
    options: [
      { value: 1, label: '1: I definitely do not want to receive credit' },
      { value: 2, label: '2: I do not need to receive credit' },
      { value: 3, label: '3: I am neutral' },
      { value: 4, label: '4: I would like to receive credit' },
      { value: 5, label: '5: I absolutely should receive credit' }
    ] },
  { id: 13, key: 'postq_concerns', block: 'B', type: 'multiselect',
    prompt: (dt) => `What is/are your main concern(s) about sharing your ${dt.inline} with App Z? (Please check all that apply)`,
    options: [
      { value: 'not_concerned', label: "I'm not concerned" },
      { value: 'dont_understand', label: "I don't understand why App Z wants it" },
      { value: 'too_personal',  label: "It's too personal or sensitive" },
      { value: 'manipulate',    label: 'It could be used to manipulate me' },
      { value: 'impersonate',   label: 'It could be used to impersonate or represent me' },
      { value: 'harm',          label: 'It could be used to harm me' },
      { value: 'no_trust',      label: "I don't trust App Z" },
      { value: 'other',         label: 'Other', has_other: true }
    ] },

  // ----- Attention check (pooled + randomized with Block A) -----
  { id: 14, key: 'attention_check', block: 'AC', type: 'attention', expected: 1,
    prompt: () => "This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all' (1).",
    anchors: { low: 'not important to me at all', high: 'extremely important to me' } }
];

const ATTENTION_CHECK_EXPECTED = 1;

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

const OPEN_RESPONSE = {
  key: 'open_data_revenue',
  prompt: 'Many companies rely on user data to improve their services or sell user data as a source of revenue. How do you feel about companies using your data? Does your answer change if your data is being used to train AI models or AI agents?'
};

const SCREEN_FLOW = [
  'consent',
  'welcome',
  'intro',
  '__scenarios__',
  'post_scenario_intro',
  '__block_b__',
  'block_a_intro',
  '__block_a__',
  'open_response',
  'about_you_intro',
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
  forBlockB,
  AI_LITERACY_QUESTIONS,
  DEMOGRAPHICS,
  SCREEN_FLOW
};
