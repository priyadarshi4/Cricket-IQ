const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const path     = require('path');

// Load data once
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/cricket_data.json'), 'utf8'));

// ── Prediction engine ──────────────────────────────────────────────────
function getH2HRate(team1, team2) {
  const k1 = `${team1}|${team2}`, k2 = `${team2}|${team1}`;
  const h2h = data.h2h[k1] || data.h2h[k2];
  if (!h2h || !h2h.total) return 0.5;
  const t1w = data.h2h[k1] ? h2h.t1_wins : h2h.t2_wins;
  return t1w / h2h.total;
}

function getTeamForm(team) {
  const recent = data.recent_matches.filter(m => m.team1 === team || m.team2 === team).slice(-5);
  if (!recent.length) return 0.5;
  return recent.filter(m => m.winner === team).length / recent.length;
}

function getVenueWinRate(team, venue) {
  const vm = data.recent_matches.filter(m => m.venue === venue && (m.team1 === team || m.team2 === team));
  return vm.length ? vm.filter(m => m.winner === team).length / vm.length : 0.5;
}

function predictMatch({ team1, team2, venue, city, tossWinner, tossDecision, matchType }) {
  const s1 = data.team_stats[team1] || { win_rate: 50, avg_score: 155 };
  const s2 = data.team_stats[team2] || { win_rate: 50, avg_score: 155 };

  const h2h      = getH2HRate(team1, team2);
  const form1    = getTeamForm(team1);
  const form2    = getTeamForm(team2);
  const scorePow = s1.avg_score / (s1.avg_score + s2.avg_score);
  const wrComp   = s1.win_rate  / (s1.win_rate  + s2.win_rate);
  const venueWR  = getVenueWinRate(team1, venue);
  const tossAdv  = tossWinner === team1 ? 1 : 0;
  const tossBat  = tossDecision === 'bat' ? 1 : 0;
  const playoff  = matchType === 'final' ? 0.02 : matchType === 'playoff' ? 0.01 : 0;

  const raw = h2h * 0.20 + scorePow * 0.22 + wrComp * 0.22 + venueWR * 0.12
            + form1 * 0.08 + (1 - form2) * 0.05
            + tossAdv * 0.07 + tossBat * tossAdv * 0.04 + playoff;

  const logit = (raw - 0.5) * 6;
  const p1    = Math.min(0.84, Math.max(0.16, 1 / (1 + Math.exp(-logit))));
  const conf  = Math.min(97, Math.round(50 + Math.abs(p1 - 0.5) * 100));

  // Explainable factors
  const factors = [];
  if (h2h > 0.55)      factors.push({ label: 'H2H Dominance',        impact: 'positive', value: `${Math.round(h2h*100)}% H2H win rate`, weight: 20, icon: '⚔️' });
  else if (h2h < 0.45) factors.push({ label: 'H2H Disadvantage',     impact: 'negative', value: `${Math.round(h2h*100)}% H2H win rate`, weight: 20, icon: '⚔️' });
  if (s1.avg_score > s2.avg_score + 5) factors.push({ label: 'Batting Firepower Lead', impact: 'positive', value: `Avg ${Math.round(s1.avg_score)} vs ${Math.round(s2.avg_score)}`, weight: 22, icon: '🏏' });
  else if (s2.avg_score > s1.avg_score + 5) factors.push({ label: 'Lower Batting Firepower', impact: 'negative', value: `Avg ${Math.round(s1.avg_score)} vs ${Math.round(s2.avg_score)}`, weight: 22, icon: '🏏' });
  if (s1.win_rate > s2.win_rate + 4) factors.push({ label: 'Win Rate Lead', impact: 'positive', value: `${s1.win_rate}% vs ${s2.win_rate}%`, weight: 18, icon: '📈' });
  else if (s2.win_rate > s1.win_rate + 4) factors.push({ label: 'Lower Win Rate', impact: 'negative', value: `${s1.win_rate}% vs ${s2.win_rate}%`, weight: 18, icon: '📈' });
  if (form1 > 0.6) factors.push({ label: 'Hot Recent Form', impact: 'positive', value: `${Math.round(form1*100)}% last-5 win rate`, weight: 8, icon: '🔥' });
  if (tossAdv) factors.push({ label: tossBat ? 'Toss Win — Batting' : 'Toss Win — Fielding', impact: 'positive', value: tossBat ? 'Setting target' : 'Chasing', weight: 7, icon: '🪙' });
  if (venueWR > 0.55) factors.push({ label: 'Strong Venue Record', impact: 'positive', value: `${Math.round(venueWR*100)}% at this ground`, weight: 12, icon: '🏟️' });
  else if (venueWR < 0.4) factors.push({ label: 'Weak Venue Record', impact: 'negative', value: `${Math.round(venueWR*100)}% at this ground`, weight: 12, icon: '🏟️' });

  return {
    team1, team2,
    team1WinProbability: Math.round(p1 * 100),
    team2WinProbability: Math.round((1 - p1) * 100),
    predictedWinner: p1 >= 0.5 ? team1 : team2,
    confidence: conf,
    keyFactors: factors.slice(0, 5),
    modelBreakdown: {
      h2h:          Math.round(h2h * 100),
      scoringPower: Math.round(scorePow * 100),
      winRateIndex: Math.round(wrComp * 100),
      venueRecord:  Math.round(venueWR * 100),
      form:         Math.round(form1 * 100),
      tossImpact:   tossAdv ? (tossBat ? 9 : 7) : 0,
    },
    featureImportance: data.feature_importance,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { team1, team2, venue = '', city = '', tossWinner, tossDecision = 'bat', matchType = 'league' } = req.body;
    if (!team1 || !team2)   return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
    if (team1 === team2)    return res.status(400).json({ success: false, message: 'Teams must be different' });

    const result = predictMatch({ team1, team2, venue, city, tossWinner: tossWinner || team1, tossDecision, matchType });

    // Optionally persist to MongoDB (no-op if Mongoose not connected)
    try {
      const Prediction = require('../models/Prediction');
      await Prediction.create({ ...result, source: 'api', ipAddress: req.ip });
    } catch { /* DB not connected — skip */ }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/predict/history  — last 10 predictions from DB
router.get('/history', async (req, res, next) => {
  try {
    const Prediction = require('../models/Prediction');
    const history = await Prediction.find().sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data: history });
  } catch {
    res.json({ success: true, data: [] });  // graceful fallback
  }
});

module.exports = router;
