// All content shown to participants. Server-side only — clients never see codes.
//
// Per data type:
//   `inline` — short mid-sentence name (intro, scenarios, Block A, …)
//   `inline_b` — optional Block A/B short name (falls back to `inline`; intro/scenarios keep `inline`)
//   `plural` / `plural_b` — grammatical number for is/are and it/them
//   `definition` — verbatim second-person definition, shown after "By <name>, we mean …"
// Source of truth for participant-facing copy: SURVEY_PAGES.md

const DATA_TYPES = [
  { id: 1,  inline: 'demographic information', plural: false,
    definition: 'Basic facts about who you are, such as your age, gender, race, level of education, marital status, income level, occupation, and state of residence.' },
  { id: 2,  inline: 'government IDs', plural: true,
    definition: "Government-issued identification, such as your driver's license, passport, or visa." },
  { id: 3,  inline: 'voice data', plural: false,
    definition: "Recordings of your voice, such as voice messages you've sent, voice recordings you've dictated, and conversations with voice assistants." },
  { id: 4,  inline: 'financial information', plural: false,
    definition: 'Records of your bank accounts, balances, and statements as well as your investments, income, credit history, and credit score.' },
  { id: 5,  inline: 'personal communications data', plural: false,
    definition: 'Emails, text messages, and direct messages on social media apps.' },
  { id: 6,  inline: 'contacts and social media connections', plural: true,
    definition: 'The list of people in your phone contacts and your connections on social media (friends, followers, followed accounts).' },
  { id: 7,  inline: 'location history', plural: false,
    definition: 'A record of where you travel and when, such as your path to work, home, and other places.' },
  { id: 8,  inline: 'web browsing history', plural: false,
    definition: 'A record of the URLs you visit online and timestamps of these visits.' },
  { id: 9,  inline: 'photo library', plural: false,
    definition: 'The photos and videos stored on your phone or in your cloud account, including pictures of you, other people, and places.' },
  { id: 10, inline: 'email management data', plural: false,
    definition: 'A record of how you manage your email inbox, such as when and how you open, archive, delete, label, or reply to emails.' },
  { id: 11, inline: 'errand-related screen recordings', plural: true,
    definition: 'Screen recordings of how you carry out errands on the computer, such as booking flights, filling out forms, filing documents, and managing your calendar (personal data can be redacted).' },
  { id: 12, inline: 'document editing history', plural: false,
    definition: 'A record of changes to your documents, presentations, or code, such as how Google/Word Docs or Google/PowerPoint Slides are drafted and revised.' },
  { id: 13, inline: 'work-related screen recordings', plural: true,
    definition: 'Screen or video recordings of your computer as you do work, showing the steps you take to complete a task from start to finish.' },
  { id: 14, inline: 'streaming preferences', plural: true,
    inline_b: 'streaming preferences data', plural_b: false,
    definition: 'A record of what you watch and listen to on streaming platforms, such as the shows, movies, and music you choose, how you interact with them, and how you rate them.' },
  { id: 15, inline: 'screen usage data', plural: false,
    definition: 'A record of how you use your device, such as which apps you open, how long you spend in each, and how you move between them — not the specifics of what is shown on your screen.' },
  { id: 16, inline: 'phone motion sensor data', plural: false,
    definition: "Readings from your phone's motion sensors that capture how you physically move and handle your device, such as when walking, driving, or picking it up." }
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
    intro_sentences: (dt) => `App Z would like to use your ${dt.inline} to improve App Z's services.`
  },
  B2: {
    code: 'B2',
    comp_use: "train App Z's AI models and AI agents to improve its services",
    scenario_use: "train App Z's AI models and AI agents to improve its services",
    data_use: "train App Z's AI models and AI agents to improve its services",
    intro_sentences: (dt) => `App Z would like to use your ${dt.inline} to train App Z's AI models and AI agents to improve its services.`
  }
};

const S1_TIERS = [
  { value: '1off',  label: 'I would accept if I receive $1 off / month (which means my subscription is $19/mo)' },
  { value: '3off',  label: 'I would accept if I receive $3 off / month (which means my subscription is $17/mo)' },
  { value: '5off',  label: 'I would accept if I receive $5 off / month (which means my subscription is $15/mo)' },
  { value: '8off',  label: 'I would accept if I receive $8 off / month (which means my subscription is $12/mo)' },
  { value: '12off', label: 'I would accept if I receive $12 off / month (which means my subscription is $8/mo)' },
  { value: '20off', label: 'I would accept if I receive $20 off / month (which means my subscription is Free)' }
];

const S2_TIERS = [
  { value: '1',  label: 'I would agree if I receive 1% of the revenue attributed to my data' },
  { value: '10', label: 'I would agree if I receive 10% of the revenue attributed to my data' },
  { value: '25', label: 'I would agree if I receive 25% of the revenue attributed to my data' },
  { value: '50', label: 'I would agree if I receive 50% of the revenue attributed to my data' },
  { value: '75', label: 'I would agree if I receive 75% of the revenue attributed to my data' },
  { value: '99', label: 'I would agree if I receive 99% of the revenue attributed to my data' }
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
    prompt: (dt) => `Do you consider your ${dt.inline} to be important?`,
    anchors: { low: 'not important to me at all', high: 'extremely important to me' } },
  { id: 2, key: 'postq_sensitivity', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you consider your ${dt.inline} to be sensitive?`,
    anchors: { low: 'not sensitive at all', high: 'extremely sensitive' } },
  { id: 3, key: 'postq_ownership', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you feel ownership over your ${dt.inline}?`,
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
    prompt: (dt) => `How identifiable (traceable to you) do you think your ${dt.inline} ${be(dt)}?`,
    anchors: { low: 'not identifiable at all', high: 'extremely identifiable' } },
  { id: 16, key: 'postq_usefulness', block: 'A', type: 'likert5',
    prompt: (dt) => `How useful do you think your ${dt.inline} ${be(dt)} to companies?`,
    anchors: { low: 'not useful at all', high: 'extremely useful' } },
  { id: 17, key: 'postq_replaceability', block: 'A', type: 'likert5',
    prompt: (dt) => `How common or replaceable do you think your ${dt.inline} ${be(dt)} across people? In other words, if you didn't provide ${itThem(dt)}, could someone else easily provide similar data?`,
    anchors: { low: 'unique to me / hard to replace', high: 'very common / easily replaceable' } },
  { id: 18, key: 'postq_control', block: 'A', type: 'likert5',
    prompt: (dt) => `How much control do you feel you have over your ${dt.inline} in general?`,
    anchors: { low: 'no control at all', high: 'complete control' } },

  // ----- Block B: about compensation for the use case -----
  { id: 7, key: 'postq_comp_by_amount', block: 'B', type: 'choice', options: YESNO_UNSURE_CARE,
    // Count plurals read oddly with "how much of your X are used"; use "information from" for ids 2 & 6.
    prompt: (dt) => (dt.id === 2 || dt.id === 6)
      ? `Should you be compensated based on how much information from your ${dt.inline} is used by App Z?`
      : `Should you be compensated based on how much of your ${dt.inline} ${be(dt)} used by App Z?`,
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
    prompt: () => "This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all'.",
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
  items: [
    {
      key: 'open_data_revenue',
      prompt: 'Many companies rely on user data to improve their services or sell user data as a source of revenue. How do you feel about companies using your data?'
    },
    {
      key: 'open_data_ai_training',
      prompt: 'Does your answer change if your data is being used to train AI models or AI agents?'
    }
  ]
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
