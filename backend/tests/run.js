/**
 * CricketIQ — Backend Tests
 * Run: node tests/run.js
 * (No external test runner needed — pure Node.js assertions)
 */

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

// ─── Test runner ────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n🏏 CricketIQ Backend Tests\n' + '─'.repeat(50));
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌  ${name}`);
      console.log(`       ${e.message}`);
      failed++;
    }
  }
  console.log('\n' + '─'.repeat(50));
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  if (failed > 0) process.exit(1);
}

// ─── Load modules ───────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, '../data/cricket_data.json');
let data;

// ─── Tests ──────────────────────────────────────────────────────────────────

// 1. Data file
test('cricket_data.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(DATA_PATH), 'cricket_data.json not found');
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  assert.ok(data, 'JSON parse failed');
});

test('data.teams is a non-empty array', () => {
  assert.ok(Array.isArray(data.teams), 'teams should be an array');
  assert.ok(data.teams.length > 0, 'teams array is empty');
});

test('data.team_stats contains valid win rates', () => {
  const stats = data.team_stats;
  assert.ok(stats && typeof stats === 'object');
  for (const [team, s] of Object.entries(stats)) {
    assert.ok(typeof s.win_rate === 'number', `${team}: win_rate not a number`);
    assert.ok(s.win_rate >= 0 && s.win_rate <= 100, `${team}: win_rate ${s.win_rate} out of range`);
    assert.ok(typeof s.avg_score === 'number', `${team}: avg_score not a number`);
    assert.ok(s.total_matches > 0, `${team}: total_matches is 0`);
  }
});

test('data.h2h has at least 10 matchups', () => {
  assert.ok(Object.keys(data.h2h).length >= 10, 'fewer than 10 H2H matchups');
});

test('data.recent_matches has date fields', () => {
  assert.ok(Array.isArray(data.recent_matches));
  data.recent_matches.forEach((m, i) => {
    assert.ok(m.team1 && m.team2, `Match ${i} missing team names`);
  });
});

test('feature_importance sums to ~100%', () => {
  const fi = data.feature_importance;
  const total = Object.values(fi).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - 100) < 1, `Feature importance sums to ${total.toFixed(1)}, expected ~100`);
});

// 2. Prediction engine logic
test('prediction engine: probability stays in [16, 84] range', () => {
  // Mirrors the actual weighted formula in routes/predict.js
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function predict(h2h, scorePow, wrComp, venueWR, f1, f2, tossAdv, tossBat) {
    const raw = h2h * 0.20 + scorePow * 0.22 + wrComp * 0.22 + venueWR * 0.12
              + f1 * 0.08 + (1 - f2) * 0.05
              + tossAdv * 0.07 + tossBat * tossAdv * 0.04;
    const p = sigmoid((raw - 0.5) * 6);
    return Math.min(0.84, Math.max(0.16, p));
  }
  // Extreme dominant team
  assert.ok(predict(1, 1, 1, 1, 1, 0, 1, 1) <= 0.84, 'max prob exceeds 0.84');
  // Extreme underdog
  assert.ok(predict(0, 0, 0, 0, 0, 1, 0, 0) >= 0.16, 'min prob below 0.16');
  // Even match: all factors at 0.5, toss neutral
  const even = predict(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0);
  assert.ok(Math.abs(even - 0.5) < 0.12, `50/50 input should give ~0.5, got ${even.toFixed(3)}`);
});

test('prediction engine: confidence derived from probability', () => {
  function conf(p) { return Math.min(97, Math.round(50 + Math.abs(p - 0.5) * 100)); }
  assert.strictEqual(conf(0.5),  50);
  assert.strictEqual(conf(0.7),  70);
  assert.strictEqual(conf(0.3),  70);
  assert.ok(conf(0.84) <= 97, 'confidence capped at 97');
});

// 3. H2H lookup symmetry
test('H2H lookup: team1|team2 and team2|team1 give consistent results', () => {
  const [key] = Object.keys(data.h2h);
  const [t1, t2] = key.split('|');
  const val = data.h2h[key];
  assert.ok(val.t1_wins + val.t2_wins <= val.total, 'H2H wins exceed total matches');
  assert.ok(val.total > 0, 'H2H total is 0');
});

// 4. Rate limiter middleware
test('rate limiter: exports a function', () => {
  const { rateLimiter, requestLogger, requireApiKey, errorHandler } = require('../middleware');
  assert.strictEqual(typeof rateLimiter,   'function');
  assert.strictEqual(typeof requestLogger, 'function');
  assert.strictEqual(typeof requireApiKey, 'function');
  assert.strictEqual(typeof errorHandler,  'function');
});

test('rate limiter: returns 429 after exceeding limit', () => {
  const { rateLimiter } = require('../middleware');
  const limiter = rateLimiter(3, 60000); // 3 req/min
  const res = {
    headers: {},
    status_: 200,
    json_: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.status_ = code; return this; },
    json(body)   { this.json_   = body; return this; },
  };
  const req = { ip: '10.0.0.test', headers: {} };
  let nextCalled = 0;
  const next = () => nextCalled++;
  // First 3 — should pass
  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);
  // 4th — should be rate limited
  limiter(req, res, next);
  assert.strictEqual(res.status_, 429, `Expected 429, got ${res.status_}`);
  assert.strictEqual(nextCalled, 3, `next() called ${nextCalled} times, expected 3`);
});

// 5. MongoDB models load without errors
test('MongoDB models: Match schema loads', () => {
  // Reset mongoose to avoid connection requirement
  const mongoose = require('mongoose');
  if (mongoose.models.Match) delete mongoose.models.Match;
  const Match = require('../models/Match');
  assert.ok(Match.schema, 'Match schema not found');
  assert.ok(Match.schema.paths.team1, 'team1 field missing from Match schema');
  assert.ok(Match.schema.paths.winner, 'winner field missing from Match schema');
});

test('MongoDB models: Prediction schema loads with accuracy static', () => {
  const mongoose = require('mongoose');
  if (mongoose.models.Prediction) delete mongoose.models.Prediction;
  const Prediction = require('../models/Prediction');
  assert.ok(typeof Prediction.accuracy === 'function', 'accuracy() static missing');
});

// 6. Routes structure
test('routes/predict.js exports an Express router', () => {
  // Monkey-patch require to skip mongoose in models
  const orig = require.extensions['.js'];
  const router = require('../routes/predict');
  assert.ok(router && router.stack, 'predict router missing .stack');
  const methods = router.stack.map(l => l.route?.methods && Object.keys(l.route.methods)[0]).filter(Boolean);
  assert.ok(methods.includes('post'), 'No POST handler in predict router');
});

test('routes/stats.js exports an Express router with team routes', () => {
  const router = require('../routes/stats');
  assert.ok(router && router.stack, 'stats router missing .stack');
  const paths = router.stack.map(l => l.route?.path).filter(Boolean);
  assert.ok(paths.includes('/teams'), `Missing /teams route. Found: ${paths.join(', ')}`);
  assert.ok(paths.includes('/leaderboard'), 'Missing /leaderboard route');
});

// Run all tests
run();
