const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && /railway|amazonaws|render/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false
});

pool.on('error', (err) => {
  console.error('Unexpected pg error:', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function withTransaction(fn) {
  return withClient(async (client) => {
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

module.exports = { pool, query, withClient, withTransaction };
