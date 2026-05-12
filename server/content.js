// All content shown to participants. Server-side only — clients never see codes.

// `inline` is the lowercase-friendly form for mid-sentence references like "share your <inline>".
const DATA_TYPES = [
  { id: 1,  label: 'Biometric identifiers',     inline: 'biometric identifiers',    definition: 'Your biometric data, such as fingerprints, facial scans, and iris patterns.' },
  { id: 2,  label: 'Health/wearable data',      inline: 'health and wearable data', definition: 'Data from health and fitness tracking, such as sleep patterns, heart rate, exercise activity, and step counts.' },
  { id: 3,  label: 'Financial transactions',    inline: 'financial transactions',   definition: 'Your financial transaction history, including purchase records, bank statements, and payment activity.' },
  { id: 4,  label: 'Location history',          inline: 'location history',         definition: 'A record of your physical locations over time, based on GPS, Wi-Fi, or cell tower data.' },
  { id: 5,  label: 'Browsing/search history',   inline: 'browsing and search history', definition: 'Your web browsing history, search queries, and media consumption (e.g., what you watch, listen to, or read online).' },
  { id: 6,  label: 'Private messages',          inline: 'private messages',         definition: 'The content of your private messages, including texts, emails, and direct messages.' },
  { id: 7,  label: 'Contacts/social graph',     inline: 'contacts and social graph', definition: 'Your contacts list and social connections — who you communicate with and how frequently.' },
  { id: 8,  label: 'Photos/videos',             inline: 'photos and videos',        definition: 'Photos and videos stored on your device or uploaded to online services.' },
  { id: 9,  label: 'Personal documents/notes',  inline: 'personal documents and notes', definition: 'Personal documents, notes, and files you have created or stored digitally.' },
  { id: 10, label: 'App interaction patterns',  inline: 'app interaction patterns', definition: 'Behavioral data about how you use apps — including what you click, how long you spend on different screens, and which features you use.' },
  { id: 11, label: 'AI conversations',          inline: 'AI conversations',         definition: "The full text of your conversations with AI chatbots — including your questions, prompts, instructions, and the AI's responses, as well as any edits or regenerations you made." }
];

const USE_CASES = {
  B1: {
    code: 'B1',
    intro_text: 'AppX uses this data to personalize your experience — showing you better recommendations, more relevant search results, and targeted ads.',
    verbatim: 'personalize your experience — showing you better recommendations, more relevant search results, and targeted ads'
  },
  B2: {
    code: 'B2',
    intro_text: 'AppX uses this data to train and improve a generative AI system (like a chatbot, writing assistant, or image generator).',
    verbatim: 'train and improve a generative AI system (like a chatbot, writing assistant, or image generator)'
  }
};

// "Learn more" copy per RESOLVE.md → lorem ipsum
const LEARN_MORE_TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

// Scenario 1 discount tiers
const S1_TIERS = [
  { key: 's1_share_1off',  label: '$1 off / month ($19/mo)' },
  { key: 's1_share_3off',  label: '$3 off / month ($17/mo)' },
  { key: 's1_share_5off',  label: '$5 off / month ($15/mo)' },
  { key: 's1_share_8off',  label: '$8 off / month ($12/mo)' },
  { key: 's1_share_12off', label: '$12 off / month ($8/mo)' },
  { key: 's1_share_20off', label: '$20 off / month (Free)' }
];

// Scenario 3 revenue share tiers
const S3_TIERS = [
  { key: 's3_share_10', label: 'You receive 10% of the selling price' },
  { key: 's3_share_50', label: 'You receive 50% of the selling price' },
  { key: 's3_share_90', label: 'You receive 90% of the selling price' }
];

const S3_REASON_OPTIONS = [
  { value: 'no_price',     label: "I don't want my data sold at any price" },
  { value: 'no_trust',     label: "I don't trust AppX to handle this correctly" },
  { value: 'uncomfortable', label: "I'm uncomfortable with third-party buyers" },
  { value: 'irreversible', label: 'The data cannot be taken back once sold' },
  { value: 'other',        label: 'Something else' }
];

// Supplementary questions S1-S9. `ordinal: true` items keep natural order; others get options randomized.
const SUPP_QUESTIONS = [
  { id: 1, key: 'supp_sensitivity', type: 'likert5', ordinal: true,
    prompt: 'How sensitive do you consider this data?',
    anchors: { low: 'Not at all sensitive', high: 'Extremely sensitive' } },
  { id: 2, key: 'supp_harm', type: 'likert5', ordinal: true,
    prompt: 'How much harm could result if this data were misused?',
    anchors: { low: 'No harm', high: 'Severe harm' } },
  { id: 3, key: 'supp_compensation_feel', type: 'choice', ordinal: false,
    prompt: 'How do you feel about sharing this data for compensation?',
    options: [
      { value: 'comfortable',     label: 'Comfortable' },
      { value: 'willing_uneasy',  label: 'Willing but uneasy' },
      { value: 'reluctant',       label: 'Reluctant' },
      { value: 'unwilling',       label: 'Unwilling at any price' }
    ] },
  { id: 4, key: 'supp_primary_concern', type: 'choice', ordinal: false,
    prompt: 'What is your primary concern about sharing this data?',
    options: [
      { value: 'not_concerned',  label: 'Not concerned' },
      { value: 'too_personal',   label: 'Too personal' },
      { value: 'manipulate',     label: 'Could manipulate me' },
      { value: 'impersonate',    label: 'Could impersonate me' },
      { value: 'no_trust',       label: "Don't trust company" },
      { value: 'not_sure',       label: 'Not sure', pin_last: true }
    ] },
  { id: 5, key: 'supp_service_improvement', type: 'likert5', ordinal: true,
    prompt: 'How much would sharing this data improve the service you receive?',
    anchors: { low: 'Not at all', high: 'Very much' } },
  { id: 6, key: 'supp_understanding', type: 'likert5', ordinal: true,
    prompt: 'How well do you understand what this data reveals about you?',
    anchors: { low: 'Not at all', high: 'Very well' } },
  { id: 7, key: 'supp_take_back', type: 'choice', ordinal: true,
    prompt: 'If you shared this data, could you effectively take it back?',
    options: [
      { value: 'yes',        label: 'Yes' },
      { value: 'partially',  label: 'Partially' },
      { value: 'no',         label: 'No' }
    ] },
  { id: 8, key: 'supp_value_to_companies', type: 'likert5', ordinal: true,
    prompt: 'How valuable do you think this data is to companies?',
    anchors: { low: 'Not at all valuable', high: 'Extremely valuable' } },
  { id: 9, key: 'supp_currently_share', type: 'choice', ordinal: false,
    prompt: 'Do you currently share this type of data with any app or service?',
    options: [
      { value: 'yes',    label: 'Yes' },
      { value: 'no',     label: 'No' },
      { value: 'unsure', label: 'Unsure' }
    ] }
];

// Compensation models for ranking + fairness/practicality
const COMP_MODELS = [
  { id: 1, key: 'per_transaction', label: 'Per-transaction payment',
    description: 'Paid each time your data is accessed or used' },
  { id: 2, key: 'royalty', label: 'Royalty model',
    description: 'Ongoing percentage of revenue generated from your data' },
  { id: 3, key: 'subscription', label: 'Subscription discount',
    description: 'Reduced price on services in exchange for data sharing' },
  { id: 4, key: 'dividend', label: 'Data dividend',
    description: 'Periodic lump-sum payment from company profits' },
  { id: 5, key: 'wage', label: 'Wage-like compensation',
    description: 'Regular payments treating data contribution as labor' }
];

const AI_USAGE_OPTIONS = [
  { value: 'never',       label: 'Never' },
  { value: 'tried',       label: 'Tried once or twice' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'daily',       label: 'Daily' }
];

// Attitude battery (1-7 Likert). Order randomized; attention check is injected at random position separately.
const ATTITUDE_ITEMS = [
  { id: 1, key: 'attitude_1', text: 'I am comfortable with companies using my data to improve AI systems.' },
  { id: 2, key: 'attitude_2', text: 'AI companies should compensate users whose data trains their models.' },
  { id: 3, key: 'attitude_3', text: 'I trust technology companies to handle my data responsibly.' },
  { id: 4, key: 'attitude_4', text: 'Data I generate through AI interactions belongs to me, not the AI company.' },
  { id: 5, key: 'attitude_5', text: 'I would rather pay more for a service than share my personal data.' },
  { id: 6, key: 'attitude_6', text: 'The benefits of AI development outweigh concerns about data collection.' }
];

const ATTENTION_CHECK_TEXT = "Please select 'Agree' to confirm you're reading this question.";
const ATTENTION_CHECK_EXPECTED = 6; // 1=Strongly Disagree, 7=Strongly Agree; "Agree" = 6

const LIKERT7_ANCHORS = { low: 'Strongly Disagree', high: 'Strongly Agree' };

// Demographics — fixed order
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
  ]},
  { key: 'income_band', prompt: 'Household income', options: [
    { value: 'lt_25',    label: 'Less than $25,000' },
    { value: '25_49',    label: '$25,000–$49,999' },
    { value: '50_74',    label: '$50,000–$74,999' },
    { value: '75_99',    label: '$75,000–$99,999' },
    { value: '100_149',  label: '$100,000–$149,999' },
    { value: '150_plus', label: '$150,000+' },
    { value: 'pna',      label: 'Prefer not to answer' }
  ]},
  { key: 'employment', prompt: 'Employment', options: [
    { value: 'full_time',     label: 'Full-time' },
    { value: 'part_time',     label: 'Part-time' },
    { value: 'self_employed', label: 'Self-employed' },
    { value: 'student',       label: 'Student' },
    { value: 'unemployed',    label: 'Unemployed' },
    { value: 'retired',       label: 'Retired' },
    { value: 'pna',           label: 'Prefer not to answer' }
  ]},
  { key: 'tech_industry', prompt: 'Do you work in the technology industry?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no',  label: 'No' },
    { value: 'pna', label: 'Prefer not to answer' }
  ]}
];

// Ordered list of screen IDs. `scenarios` is a placeholder slot expanded per participant.
const SCREEN_FLOW = [
  'consent',
  'scenario_intro',
  'data_type_intro',
  'comprehension',
  // scenarios expand here in scenario_order
  'scenario_1',
  'scenario_2',
  'scenario_3',
  'supplementary',
  'compensation',
  'ai_usage',
  'attitudes',
  'demographics',
  'debrief'
];

module.exports = {
  DATA_TYPES,
  USE_CASES,
  LEARN_MORE_TEXT,
  S1_TIERS,
  S3_TIERS,
  S3_REASON_OPTIONS,
  SUPP_QUESTIONS,
  COMP_MODELS,
  AI_USAGE_OPTIONS,
  ATTITUDE_ITEMS,
  ATTENTION_CHECK_TEXT,
  ATTENTION_CHECK_EXPECTED,
  LIKERT7_ANCHORS,
  DEMOGRAPHICS,
  SCREEN_FLOW
};
