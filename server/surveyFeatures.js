// Survey feature toggles — flip these without rewriting the flow elsewhere.
//
// ENABLE_SCENARIO_SLIDER_FOLLOWUPS
//   When true, each scenario (checkboxes) is followed by an identical page
//   that asks the same question with a slider instead.
//   Set to false to skip those two pages entirely.

const ENABLE_SCENARIO_SLIDER_FOLLOWUPS = true;

module.exports = { ENABLE_SCENARIO_SLIDER_FOLLOWUPS };
