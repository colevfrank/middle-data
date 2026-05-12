const { query } = require('./db');

const COOKIE_NAME = 'sid';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 2 // 2 days; survey is ~15 min but allow resume
};

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    ...COOKIE_OPTS,
    secure: process.env.NODE_ENV === 'production'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Middleware: load participant from session cookie + verify CSRF (header matches cookie).
// For state-changing routes (POST), require the X-Session-Token header to match the cookie value.
async function authenticate(req, res, next) {
  const cookieToken = req.cookies && req.cookies[COOKIE_NAME];
  if (!cookieToken) {
    return res.status(401).json({ error: 'no_session' });
  }

  // CSRF: require header on POSTs
  if (req.method === 'POST') {
    const headerToken = req.get('X-Session-Token');
    if (!headerToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: 'csrf_mismatch' });
    }
  }

  const result = await query(
    'SELECT * FROM participants WHERE session_token = $1',
    [cookieToken]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'invalid_session' });
  }

  req.participant = result.rows[0];
  next();
}

module.exports = { COOKIE_NAME, setSessionCookie, clearSessionCookie, authenticate };
