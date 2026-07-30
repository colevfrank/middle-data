// All content shown to participants. Server-side only — clients never see codes.

// `inline` is the lowercase-friendly form for mid-sentence references like "share your <inline>".
// `definition` is the short description (used in the comprehension check); `learn_more` is the
// longer, example-rich description shown inline on the intro screen (Screen 3). `category` is an
// internal grouping — never sent to clients.
const DATA_TYPES = [
  { id: 1,  label: 'Demographic info', inline: 'demographic information',
    definition: 'Name, age, gender, ZIP code, marital status',
    learn_more: 'Basic identifying and demographic information such as your full name, date of birth, sex or gender, home ZIP code, and marital status.',
    category: 'Demographic/Identity' },
  { id: 2,  label: 'Social security number', inline: 'Social Security number',
    definition: 'Your 9-digit SSN',
    learn_more: 'Your Social Security number, used for tax reporting, credit checks, and identity verification.',
    category: 'Demographic/Identity' },
  { id: 3,  label: 'Fingerprint and voice recording data', inline: 'fingerprint and voice recording data',
    definition: 'Biometric data from your body',
    learn_more: 'Your stored fingerprints, such as from unlocking your phone, and recordings of your voice, such as from voice assistants or phone calls.',
    category: 'Demographic/Identity' },
  { id: 4,  label: 'Health information', inline: 'health information',
    definition: 'Medical records and prescriptions',
    learn_more: "Information about your health, including doctor's appointments, lab and test results, diagnosed conditions, and prescription medications.",
    category: 'Sensitive Personal' },
  { id: 5,  label: 'Financial information', inline: 'financial information',
    definition: 'Bank statements, taxes, transactions',
    learn_more: 'Your financial records, including bank and credit card statements, tax documents, and transaction history.',
    category: 'Sensitive Personal' },
  { id: 6,  label: 'Password and login credential data', inline: 'password and login credential data',
    definition: 'Passwords, PINs, and security keys',
    learn_more: 'The passwords, PINs, and security credentials you use to log in to websites, apps, and accounts.',
    category: 'Sensitive Personal' },
  { id: 7,  label: 'Text message and email content', inline: 'text message and email content',
    definition: 'Content of your private communications',
    learn_more: 'The actual content of your text messages, emails, and direct messages — what you wrote and what you received.',
    category: 'Relational/Communicative' },
  { id: 8,  label: 'Contact info of friends and family', inline: 'contact information of friends and family',
    definition: 'Names, numbers, and emails of people you know',
    learn_more: 'The names, phone numbers, email addresses, and other contact details of people stored in your phone or email contacts.',
    category: 'Relational/Communicative' },
  { id: 9,  label: 'Location history', inline: 'location history',
    definition: "A record of where you've been",
    learn_more: 'A log of your physical locations over time, based on GPS, Wi-Fi, or cell tower data from your phone or other devices.',
    category: 'Behavioral/Preference' },
  { id: 10, label: 'Browsing and search history', inline: 'browsing and search history',
    definition: 'Websites visited and searches made',
    learn_more: "A record of the websites you've visited, links you've clicked, and queries you've typed into search engines.",
    category: 'Behavioral/Preference' },
  { id: 11, label: 'Shopping and purchase history', inline: 'shopping and purchase history',
    definition: "What you've bought and where",
    learn_more: 'A record of your purchases — what you bought, when, where, and how much you paid — across online and in-store transactions.',
    category: 'Behavioral/Preference' },
  { id: 12, label: 'Document, note, and report data', inline: 'document, note, and report data',
    definition: "Files you've written for work or school",
    learn_more: "Documents, notes, essays, reports, and other files you've created for professional or academic purposes.",
    category: 'Expressive' },
  { id: 13, label: 'Photo and video data', inline: 'photo and video data',
    definition: 'Images and recordings from your camera',
    learn_more: 'Photos and videos you have personally captured and stored on your device or uploaded to cloud services.',
    category: 'Expressive' },
  { id: 14, label: 'Email triage behavior', inline: 'email triage behavior',
    definition: 'How you sort, flag, and manage your inbox',
    learn_more: 'Behavioral patterns in how you manage email — the order you open messages, what you archive versus flag versus defer, and how you edit drafts before sending, but not the content of the emails themselves.',
    category: 'Process' },
  { id: 15, label: 'Search and decision trajectory data', inline: 'search and decision trajectory data',
    definition: 'How you research and make decisions online',
    learn_more: 'The sequence of steps you take when researching a decision online, such as the tabs you open, options you compare, filters you apply, and how long you spend before choosing when booking flights, shopping, or comparing services.',
    category: 'Process' },
  { id: 16, label: 'Writing and editing process', inline: 'writing and editing process',
    definition: 'How you draft, revise, and re-write',
    learn_more: 'The sequence of keystrokes, deletions, rewrites, and pauses as you compose a document or message, including what you typed and then deleted, how long you paused between sentences, and how many times you revised a paragraph, but not the final version itself.',
    category: 'Process' }
];

const USE_CASES = {
  B1: {
    code: 'B1',
    // Third person "its" — comprehension statement 2 ("App Z would use your data to <comp_use>").
    comp_use: 'improve its personalization algorithm',
    // First person "our" — scenario frame ("We will use this information to <scenario_use>").
    scenario_use: 'improve our personalization algorithm',
    // Noun form used by Block B post-scenario questions ("…was used for <data_use>").
    data_use: 'improving a personalization algorithm',
    // Two-sentence framing shown on the intro screen (dt = assigned data type).
    intro_sentences: (dt) => `App Z would like to use your ${dt.inline} to improve its personalization algorithm. Using your ${dt.inline} would allow it to provide content that is more targeted to you.`
  },
  B2: {
    code: 'B2',
    comp_use: 'improve its generative AI system',
    scenario_use: 'improve our generative AI system',
    data_use: 'training and improving a generative AI system (like a chatbot, writing assistant, or image generator)',
    intro_sentences: (dt) => `App Z would like to use your ${dt.inline} to improve its generative AI system. Using your ${dt.inline} would allow it to train a generative AI system (like a chatbot, writing assistant, or image generator).`
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

// Post-scenario questions: Block A (about the data type) + Block B (about compensation for the
// use case) + one attention check. All 14 are pooled and randomized together (post_question_order),
// each shown on its own screen. `key` doubles as the DB column name. `prompt(dt, uc)` builds the
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
    prompt: (dt) => `Is ${dt.label} important to you?`,
    anchors: { low: 'not important to me at all', high: 'extremely important to me' } },
  { id: 2, key: 'postq_sensitivity', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you consider ${dt.label} sensitive data?`,
    anchors: { low: 'not sensitive at all', high: 'extremely sensitive' } },
  { id: 3, key: 'postq_ownership', block: 'A', type: 'likert5',
    prompt: (dt) => `Do you feel ownership over ${dt.label}?`,
    anchors: { low: 'I do not feel ownership over this type of data', high: 'I feel strong ownership over it' } },
  { id: 4, key: 'postq_share_public', block: 'A', type: 'choice_num',
    prompt: (dt) => `Would you ever share your ${dt.label} publicly – for example with a room of people you have never met before? Choose the option that best describes how far you'd be willing to go:`,
    options: [
      { value: 0, label: 'No — I would never share it publicly.' },
      { value: 1, label: 'Maybe — it would depend on the situation.' },
      { value: 2, label: 'Yes, but only without my name attached (anonymously).' },
      { value: 3, label: 'Yes, including with my name attached.' }
    ] },
  { id: 5, key: 'postq_buy_sell_appropriate', block: 'A', type: 'likert5',
    prompt: (dt) => `Is it appropriate to buy and sell your ${dt.label}?`,
    anchors: { low: 'Completely inappropriate', high: 'Completely appropriate' } },
  { id: 6, key: 'postq_upset_if_leaked', block: 'A', type: 'likert5',
    prompt: (dt) => `If you found out your ${dt.label} had been released publicly without your knowledge, how upset would you be?`,
    anchors: { low: 'not at all', high: 'Extremely' } },

  // ----- Block B: about compensation for the use case -----
  { id: 7, key: 'postq_comp_by_amount', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: (dt, uc) => `Assuming your ${dt.label} was used for ${uc.data_use}, should you be compensated based on how much of your data was used?` },
  { id: 8, key: 'postq_comp_per_use', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: (dt, uc) => `Assuming your ${dt.label} was used for ${uc.data_use}, should you be compensated each time it's used?` },
  { id: 9, key: 'postq_comp_by_effort', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: (dt, uc) => `Assuming your ${dt.label} was used for ${uc.data_use}, should you be compensated based on how hard it was to generate the data?` },
  { id: 10, key: 'postq_comp_by_originality', block: 'B', type: 'choice', options: YESNO_UNSURE,
    prompt: (dt, uc) => `Assuming your ${dt.label} was used for ${uc.data_use}, should you be compensated for how original your data is relative to others'?` },
  { id: 11, key: 'postq_coworker_sells_feel', block: 'B', type: 'choice',
    prompt: (dt, uc) => `Assuming a coworker got a hold of your ${dt.label} and managed to sell it to a company using it for ${uc.data_use}, how would you feel?`,
    options: [
      { value: 'very_upset',   label: 'Very upset' },
      { value: 'little_upset', label: 'A little upset' },
      { value: 'confused',     label: 'Confused' },
      { value: 'dont_care',    label: "Don't care at all" },
      { value: 'happy',        label: 'Happy for them' }
    ] },
  { id: 12, key: 'postq_credit_ack', block: 'B', type: 'likert5',
    prompt: (dt, uc) => `Should you receive credit or acknowledgement for ${dt.label} when your data is used for ${uc.data_use}?`,
    anchors: { low: 'Not at all', high: 'Completely' } },
  { id: 13, key: 'postq_concerns', block: 'B', type: 'multiselect',
    prompt: (dt, uc) => `What is/are your main concern(s) about sharing your ${dt.label} for ${uc.data_use}? (Please check all that apply)`,
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

// Ordered list of screen IDs. `__scenarios__` and `__post_questions__` are placeholder slots
// expanded per participant (in scenario_order / post_question_order).
const SCREEN_FLOW = [
  'consent',
  'welcome',
  'intro',
  '__scenarios__',
  '__post_questions__',
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
