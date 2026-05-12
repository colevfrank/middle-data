const crypto = require('crypto');

// In-memory hashed-IP throttle. Daily salt rotates so hashes are not stable identifiers.
// 15 starts per hashed IP per rolling 60 minutes.

const MAX_PER_HOUR = 15;
const WINDOW_MS = 60 * 60 * 1000;

let dailySalt = crypto.randomBytes(16).toString('hex');
let saltRotatedAt = Date.now();

function maybeRotateSalt() {
  if (Date.now() - saltRotatedAt > 24 * 60 * 60 * 1000) {
    dailySalt = crypto.randomBytes(16).toString('hex');
    saltRotatedAt = Date.now();
    buckets.clear();
  }
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + ':' + dailySalt).digest('hex');
}

// Map<hashedIp, timestamps[]>
const buckets = new Map();

function checkAndRecord(ip) {
  maybeRotateSalt();
  const key = hashIp(ip);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let arr = buckets.get(key) || [];
  arr = arr.filter(t => t > cutoff);

  if (arr.length >= MAX_PER_HOUR) {
    buckets.set(key, arr);
    return { ok: false, retryAfterMs: arr[0] + WINDOW_MS - now };
  }

  arr.push(now);
  buckets.set(key, arr);
  return { ok: true };
}

function getClientIp(req) {
  // Railway / standard proxy headers
  const xff = req.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || '0.0.0.0';
}

module.exports = { checkAndRecord, getClientIp };
