const { withClient } = require('./db');
const { SUPP_QUESTIONS, COMP_MODELS, ATTITUDE_ITEMS } = require('./content');

const TARGET_N = 6600;
const CELLS_PER_BLOCK = 22; // 11 data types × 2 use cases
const PER_CELL_TARGET = TARGET_N / CELLS_PER_BLOCK; // 300

const ADVISORY_LOCK_KEY = 4242;

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let assignmentBag = []; // [{data_type, use_case}]
let bagInitialized = false;

async function refillBag(client) {
  const { rows } = await client.query(
    `SELECT data_type, use_case, COUNT(*)::int AS n
       FROM participants
      GROUP BY data_type, use_case`
  );
  const countMap = new Map();
  for (const r of rows) {
    countMap.set(`${r.data_type}:${r.use_case}`, r.n);
  }

  const bag = [];
  for (let dt = 1; dt <= 11; dt++) {
    for (const uc of ['B1', 'B2']) {
      const have = countMap.get(`${dt}:${uc}`) || 0;
      const need = Math.max(0, PER_CELL_TARGET - have);
      for (let i = 0; i < need; i++) {
        bag.push({ data_type: dt, use_case: uc });
      }
    }
  }

  if (bag.length === 0) {
    // Past target — fall back to pure random
    for (let dt = 1; dt <= 11; dt++) {
      for (const uc of ['B1', 'B2']) {
        bag.push({ data_type: dt, use_case: uc });
      }
    }
  }

  assignmentBag = shuffle(bag);
  bagInitialized = true;
}

// Returns { data_type, use_case }. Uses Postgres advisory lock to serialize.
async function assignCell() {
  return withClient(async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    try {
      if (!bagInitialized || assignmentBag.length === 0) {
        await refillBag(client);
      }
      const cell = assignmentBag.shift();
      return cell;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
  });
}

function randomOrder(n) {
  const arr = [];
  for (let i = 1; i <= n; i++) arr.push(i);
  return shuffle(arr);
}

function randomOrderArray(items) {
  return shuffle(items.map(x => x.id));
}

// S4 options must keep "Not sure" pinned at the end
function s4OptionOrder() {
  const s4 = SUPP_QUESTIONS.find(q => q.id === 4);
  const indices = s4.options.map((_, i) => i);
  const pinnedLastIndex = s4.options.findIndex(o => o.pin_last);
  const rest = indices.filter(i => i !== pinnedLastIndex);
  return [...shuffle(rest), pinnedLastIndex];
}

function generateAllOrderings() {
  return {
    scenario_order: shuffle([1, 2, 3]),
    supp_question_order: randomOrderArray(SUPP_QUESTIONS),
    attitude_item_order: randomOrderArray(ATTITUDE_ITEMS),
    comp_model_order: randomOrderArray(COMP_MODELS),
    s4_option_order: s4OptionOrder(),
    // attention check inserted into attitudes at position 0..6 (7 possible slots in a list of 6+1)
    attention_check_position: Math.floor(Math.random() * (ATTITUDE_ITEMS.length + 1))
  };
}

module.exports = { assignCell, generateAllOrderings, shuffle };
