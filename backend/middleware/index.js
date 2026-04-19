/**
 * middleware/index.js
 * Lightweight rate limiter and request logger — no external deps.
 */

// ── In-memory rate limiter (replace with redis-rate-limiter in production) ──//
const hitMap = new Map();   // ip -> [timestamps]

function rateLimiter(maxReqs = 60, windowMs = 60_000) {
  return (req, res, next) => {
    const ip  = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!hitMap.has(ip)) hitMap.set(ip, []);
    const hits = hitMap.get(ip).filter(t => now - t < windowMs);
    hits.push(now);
    hitMap.set(ip, hits);

    res.setHeader('X-RateLimit-Limit',     maxReqs);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxReqs - hits.length));

    if (hits.length > maxReqs) {
      return res.status(429).json({ success: false, message: 'Too many requests. Slow down!' });
    }
    next();
  };
}

// ── Request logger ──
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms    = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`${color}${res.statusCode}${reset} ${req.method.padEnd(6)} ${req.path.padEnd(30)} ${ms}ms`);
  });
  next();
}

// ── Simple API key auth (for admin routes) ──
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!process.env.ADMIN_API_KEY || key === process.env.ADMIN_API_KEY) return next();
  res.status(401).json({ success: false, message: 'Invalid or missing API key' });
}

// ── Error handler ──
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { rateLimiter, requestLogger, requireApiKey, errorHandler };
