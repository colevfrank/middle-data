const { withClient } = require('./db');
const { POST_QUESTIONS } = require('./content');

// Completes per cell (16 data types × 2 use cases = 32 cells). Defaults to 100
// (N = 3200); override with the PER_CELL_TARGET env var, e.g. 10 for the pilot.
const DEFAULT_PER_CELL_TARGET = 100;
const PER_CELL_TARGET = (() => {
  const raw = process.env.PER_CELL_TARGET;
  if (raw === undefined || raw === '') return DEFAULT_PER_CELL_TARGET;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`PER_CELL_TARGET must be a positive integer, got "${raw}"`);
  }
  return n;
})();

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

// The per-cell target counts completes. Sessions still in progress (started within
// this window, consent not refused) hold their slot so a burst of starts doesn't
// overfill a cell; abandoned sessions release it once the window passes.
const ACTIVE_WINDOW_HOURS = 2;

async function refillBag(client) {
  const { rows } = await client.query(
    `SELECT data_type, use_case, COUNT(*)::int AS n
       FROM participants
      WHERE completed
         OR (current_screen <> 'returned' AND created_at > NOW() - make_interval(hours => $1))
      GROUP BY data_type, use_case`,
    [ACTIVE_WINDOW_HOURS]
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

function generateAllOrderings() {
  const blockB = POST_QUESTIONS.filter(q => q.block === 'B').map(q => q.id);
  const blockA = POST_QUESTIONS.filter(q => q.block === 'A' || q.block === 'AC').map(q => q.id);
  return {
    // Two scenarios: 1 = subscription discount, 2 = data sharing program
    scenario_order: shuffle([1, 2]),
    // Block B shown first (7 questions), then Block A (10 questions + attention check),
    // each randomized within its block.
    block_b_order: shuffle(blockB),
    block_a_order: shuffle(blockA)
  };
}

module.exports = { assignCell, generateAllOrderings, shuffle };
