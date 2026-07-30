const { withClient } = require('./db');
const { POST_QUESTIONS } = require('./content');

const TARGET_N = 3200;
const CELLS_PER_BLOCK = 32; // 16 data types × 2 use cases
const PER_CELL_TARGET = Math.floor(TARGET_N / CELLS_PER_BLOCK); // 100

const NUM_DATA_TYPES = 16;

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
  for (let dt = 1; dt <= NUM_DATA_TYPES; dt++) {
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
    for (let dt = 1; dt <= NUM_DATA_TYPES; dt++) {
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

function randomOrderArray(items) {
  return shuffle(items.map(x => x.id));
}

function generateAllOrderings() {
  return {
    // Two scenarios: 1 = subscription discount, 2 = data sharing program
    scenario_order: shuffle([1, 2]),
    // All 14 post-scenario items (Block A + Block B + attention check) randomized together
    post_question_order: randomOrderArray(POST_QUESTIONS)
  };
}

module.exports = { assignCell, generateAllOrderings, shuffle };
