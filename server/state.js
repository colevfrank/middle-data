// State machine: given a participant row and their current screen, compute the next screen id.

const FIXED_ORDER = [
  'consent',
  'scenario_intro',
  'data_type_intro',
  'comprehension',
  '__scenarios__',  // expanded via scenario_order
  'supplementary',
  'compensation',
  'ai_usage',
  'attitudes',
  'demographics',
  'debrief',
  'complete'
];

function scenarioIdAt(participant, position) {
  const scenarioNum = participant.scenario_order[position];
  return `scenario_${scenarioNum}`;
}

function isScenario(screenId) {
  return /^scenario_[123]$/.test(screenId);
}

// After a successful submit of `currentScreen`, what's next?
function nextAfter(participant, currentScreen) {
  if (isScenario(currentScreen)) {
    const num = parseInt(currentScreen.split('_')[1], 10);
    const idx = participant.scenario_order.indexOf(num);
    if (idx < participant.scenario_order.length - 1) {
      return `scenario_${participant.scenario_order[idx + 1]}`;
    }
    return 'supplementary';
  }

  const linear = [
    'consent',
    'scenario_intro',
    'data_type_intro',
    'comprehension'
  ];
  const idx = linear.indexOf(currentScreen);
  if (idx >= 0 && idx < linear.length - 1) {
    return linear[idx + 1];
  }
  if (currentScreen === 'comprehension') {
    return scenarioIdAt(participant, 0);
  }

  // post-scenarios sequence
  const post = ['supplementary', 'compensation', 'ai_usage', 'attitudes', 'demographics', 'debrief', 'complete'];
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

module.exports = { nextAfter, resumeScreen, isScenario };
