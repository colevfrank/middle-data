// State machine: given a participant row and their current screen, compute the next screen id.

const FIXED_ORDER = [
  'consent',
  'welcome',
  'intro',
  '__scenarios__',        // expanded via scenario_order (+ scenario_transition between)
  'post_scenario_intro',
  '__block_b__',          // expanded via block_b_order
  '__block_a__',          // expanded via block_a_order
  'open_response',
  'about_you_intro',
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

// After a successful submit of `currentScreen`, what's next?
function nextAfter(participant, currentScreen) {
  if (isScenario(currentScreen)) {
    const num = parseInt(currentScreen.split('_')[1], 10);
    const idx = participant.scenario_order.indexOf(num);
    if (idx < participant.scenario_order.length - 1) {
      return 'scenario_transition'; // beat between the two scenarios
    }
    return 'post_scenario_intro';
  }

  // The transition follows the first scenario; go to the second.
  if (currentScreen === 'scenario_transition') {
    return `scenario_${participant.scenario_order[1]}`;
  }

  // Post-scenario intro → first Block B question.
  if (currentScreen === 'post_scenario_intro') {
    return `postq_${participant.block_b_order[0]}`;
  }

  if (isPostQuestion(currentScreen)) {
    const qid = parseInt(currentScreen.split('_')[1], 10);
    const bIdx = participant.block_b_order.indexOf(qid);
    if (bIdx >= 0) {
      if (bIdx < participant.block_b_order.length - 1) {
        return `postq_${participant.block_b_order[bIdx + 1]}`;
      }
      return `postq_${participant.block_a_order[0]}`; // Block B done → first Block A
    }
    const aIdx = participant.block_a_order.indexOf(qid);
    if (aIdx >= 0 && aIdx < participant.block_a_order.length - 1) {
      return `postq_${participant.block_a_order[aIdx + 1]}`;
    }
    return 'open_response'; // Block A done
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
  const post = ['open_response', 'about_you_intro', 'ai_usage', 'demographics', 'debrief', 'complete'];
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
