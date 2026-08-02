const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const startRoute = require('./routes/start');
const screenRoute = require('./routes/screen');
const adminRoute = require('./routes/admin');
const { authenticate, COOKIE_NAME } = require('./session');

const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Lightweight endpoint for the client to fetch its CSRF token (= session token).
// Same-origin only by CORS; cookie must be present.
app.get('/session-token', (req, res) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'no_session' });
  res.json({ token });
});

app.use(startRoute);
app.use(screenRoute);
app.use(adminRoute);

// Static assets (after routes so /start and /screen take priority)
app.use(express.static(path.join(__dirname, '..', 'public'), {
  index: false,
  maxAge: 0
}));

app.get('/', (req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Survey</title>
<link rel="stylesheet" href="/styles.css"></head>
<body class="min-h-screen flex items-center justify-center bg-gray-50">
<div class="max-w-md p-8 bg-white rounded shadow text-center">
<h1 class="text-lg font-semibold mb-3">Survey</h1>
<p class="text-gray-700">This survey can only be accessed via CloudResearch. Please return to CloudResearch and use the study link.</p>
</div></body></html>`);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'server_error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Survey server listening on port ${port}`);
});
