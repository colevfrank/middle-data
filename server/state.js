// State machine: given a participant row and their current screen, compute the next screen id.

const FIXED_ORDER = [
  'consent',
  'welcome',
  'intro',
  '__scenarios__',      // expanded via scenario_order
  '__post_questions__', // expanded via post_question_order
  'open_response',
  'ai_usage',
  'demographics',
  'debrief',
  'complete'
];

function isScenario(screenId) {
  return /^scenario_[12]$/.test(screenId);
}

function isPostQuestion(screenId) {
  return /^postq_\d+$/.test(screenId);
}

function firstPostQuestion(participant) {
  return `postq_${participant.post_question_order[0]}`;
}

// After a successful submit of `currentScreen`, what's next?
function nextAfter(participant, currentScreen) {
  if (isScenario(currentScreen)) {
    const num = parseInt(currentScreen.split('_')[1], 10);
    const idx = participant.scenario_order.indexOf(num);
    if (idx < participant.scenario_order.length - 1) {
      return `scenario_${participant.scenario_order[idx + 1]}`;
    }
    return firstPostQuestion(participant);
  }

  if (isPostQuestion(currentScreen)) {
    const qid = parseInt(currentScreen.split('_')[1], 10);
    const idx = participant.post_question_order.indexOf(qid);
    if (idx < participant.post_question_order.length - 1) {
      return `postq_${participant.post_question_order[idx + 1]}`;
    }
    return 'open_response';
  }

  const linear = [
    'consent',
    'welcome',
    'intro'
  ];
  const idx = linear.indexOf(currentScreen);
  if (idx >= 0 && idx < linear.length - 1) {
    return linear[idx + 1];
  }
  if (currentScreen === 'intro') {
    return `scenario_${participant.scenario_order[0]}`;
  }

  // post-questions sequence
  const post = ['open_response', 'ai_usage', 'demographics', 'debrief', 'complete'];
  const postIdx = post.indexOf(currentScreen);
  if (postIdx >= 0 && postIdx < post.length - 1) {
    return post[postIdx + 1];
  }
  return null;
}

// Used by /start to figure out where to drop a resuming participant.
// `current_screen` IS the screen they should see next (i.e., we update it on submit, not on view).
function resumeScreen(participant) {
  return participant.current_screen;
}

module.exports = { nextAfter, resumeScreen, isScenario, isPostQuestion };
