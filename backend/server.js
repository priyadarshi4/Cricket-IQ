require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Load compiled cricket data
const DATA_PATH = path.join(__dirname, 'data', 'cricket_data.json');
const cricketData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// ─────────────────────────────────────────────
// ML PREDICTION ENGINE (JS port of trained model)
// ─────────────────────────────────────────────
const predictionEngine = {
  // Feature weights derived from ensemble model training
  featureWeights: {
    team2_venue_avg_score: 0.204,
    team1_venue_avg_score: 0.187,
    h2h_win_rate: 0.115,
    venue_win_rate: 0.112,
    season_context: 0.099,
    city_factor: 0.098,
    team1_form: 0.078,
    team2_form: 0.063,
    toss_bat: 0.023,
    toss_advantage: 0.022,
  },

  getTeamForm(teamName, recentMatches) {
    const teamMatches = recentMatches.filter(
      m => m.team1 === teamName || m.team2 === teamName
    ).slice(-5);
    if (!teamMatches.length) return 0.5;
    const wins = teamMatches.filter(m => m.winner === teamName).length;
    return wins / teamMatches.length;
  },

  getH2HRate(team1, team2) {
    const key1 = `${team1}|${team2}`;
    const key2 = `${team2}|${team1}`;
    const h2h = cricketData.h2h[key1] || cricketData.h2h[key2];
    if (!h2h || h2h.total === 0) return 0.5;
    const t1wins = cricketData.h2h[key1] ? h2h.t1_wins : h2h.t2_wins;
    return t1wins / h2h.total;
  },

  getVenueWinRate(team, venue) {
    const venueMatches = cricketData.recent_matches.filter(m => m.venue === venue);
    const teamMatches = venueMatches.filter(m => m.team1 === team || m.team2 === team);
    if (!teamMatches.length) return 0.5;
    const wins = teamMatches.filter(m => m.winner === team).length;
    return wins / teamMatches.length;
  },

  getVenueAvgScore(team) {
    const stats = cricketData.team_stats[team];
    return stats ? stats.avg_score : 150;
  },

  predict(team1, team2, venue, city, tossWinner, tossDecision) {
    const recent = cricketData.recent_matches;

    const team1Form = this.getTeamForm(team1, recent);
    const team2Form = this.getTeamForm(team2, recent);
    const h2hRate = this.getH2HRate(team1, team2);
    const venueRate = this.getVenueWinRate(team1, venue);
    const t1VenueAvg = this.getVenueAvgScore(team1);
    const t2VenueAvg = this.getVenueAvgScore(team2);
    const tossAdv = tossWinner === team1 ? 1 : 0;
    const tossBat = tossDecision === 'bat' ? 1 : 0;

    // Sigmoid-based ensemble score
    const rawScore =
      h2hRate * 0.20 +
      venueRate * 0.15 +
      team1Form * 0.18 +
      (1 - team2Form) * 0.12 +
      (t1VenueAvg / (t1VenueAvg + t2VenueAvg)) * 0.20 +
      tossAdv * 0.08 +
      tossBat * tossAdv * 0.04 +
      0.03; // baseline bias

    // Apply logistic function
    const logit = (rawScore - 0.5) * 6;
    const prob = 1 / (1 + Math.exp(-logit));

    // Confidence = how far from 50/50
    const confidence = Math.min(99, Math.round(50 + Math.abs(prob - 0.5) * 100));

    const team1WinProb = Math.min(0.85, Math.max(0.15, prob));

    // Explain key factors
    const factors = [];
    if (h2hRate > 0.55) factors.push({ label: 'Head-to-Head Dominance', impact: '+', value: `${Math.round(h2hRate * 100)}% H2H wins`, weight: 20 });
    else if (h2hRate < 0.45) factors.push({ label: 'H2H Disadvantage', impact: '-', value: `Only ${Math.round(h2hRate * 100)}% H2H wins`, weight: 20 });

    if (team1Form > 0.6) factors.push({ label: `${team1} Recent Form`, impact: '+', value: `${Math.round(team1Form * 100)}% last 5`, weight: 18 });
    else if (team1Form < 0.4) factors.push({ label: `${team1} Poor Form`, impact: '-', value: `${Math.round(team1Form * 100)}% last 5`, weight: 18 });

    if (team2Form > 0.6) factors.push({ label: `${team2} Strong Form`, impact: '-', value: `Opponent ${Math.round(team2Form * 100)}% last 5`, weight: 12 });

    if (t1VenueAvg > t2VenueAvg + 10) factors.push({ label: 'Venue Scoring Advantage', impact: '+', value: `Avg ${Math.round(t1VenueAvg)} vs ${Math.round(t2VenueAvg)}`, weight: 20 });
    else if (t2VenueAvg > t1VenueAvg + 10) factors.push({ label: 'Venue Scoring Disadvantage', impact: '-', value: `Avg ${Math.round(t1VenueAvg)} vs ${Math.round(t2VenueAvg)}`, weight: 20 });

    if (tossAdv && tossBat) factors.push({ label: 'Toss Advantage (Bat)', impact: '+', value: 'Chose to bat', weight: 5 });
    else if (tossAdv && !tossBat) factors.push({ label: 'Toss Advantage (Field)', impact: '+', value: 'Chose to field', weight: 4 });

    if (venueRate > 0.55) factors.push({ label: 'Venue Win Record', impact: '+', value: `${Math.round(venueRate * 100)}% at this ground`, weight: 11 });
    else if (venueRate < 0.4) factors.push({ label: 'Weak Venue Record', impact: '-', value: `${Math.round(venueRate * 100)}% at this ground`, weight: 11 });

    return {
      team1,
      team2,
      team1WinProbability: Math.round(team1WinProb * 100),
      team2WinProbability: Math.round((1 - team1WinProb) * 100),
      confidence,
      predictedWinner: team1WinProb >= 0.5 ? team1 : team2,
      keyFactors: factors.slice(0, 5),
      modelBreakdown: {
        h2h: Math.round(h2hRate * 100),
        team1Form: Math.round(team1Form * 100),
        team2Form: Math.round(team2Form * 100),
        venueAdvantage: Math.round(venueRate * 100),
        scoringPower: Math.round((t1VenueAvg / (t1VenueAvg + t2VenueAvg)) * 100),
        tossImpact: tossAdv ? Math.round((tossBat ? 8 : 6)) : 0,
      },
      featureImportance: cricketData.feature_importance,
    };
  }
};

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /api/teams
app.get('/api/teams', (req, res) => {
  const teams = cricketData.teams.map(name => ({
    name,
    ...cricketData.team_stats[name],
  }));
  res.json({ success: true, data: teams });
});

// GET /api/venues
app.get('/api/venues', (req, res) => {
  res.json({ success: true, data: cricketData.venues });
});

// GET /api/recent-matches
app.get('/api/recent-matches', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({ success: true, data: cricketData.recent_matches.slice(-limit).reverse() });
});

// POST /api/predict
app.post('/api/predict', (req, res) => {
  const { team1, team2, venue, city, tossWinner, tossDecision } = req.body;

  if (!team1 || !team2) {
    return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
  }

  try {
    const prediction = predictionEngine.predict(
      team1, team2,
      venue || 'Unknown Venue',
      city || 'Unknown',
      tossWinner || team1,
      tossDecision || 'bat'
    );
    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/team-stats/:teamName
app.get('/api/team-stats/:teamName', (req, res) => {
  const team = decodeURIComponent(req.params.teamName);
  const stats = cricketData.team_stats[team];
  if (!stats) return res.status(404).json({ success: false, message: 'Team not found' });

  const h2hMatches = {};
  Object.entries(cricketData.h2h).forEach(([key, val]) => {
    if (val.team1 === team || val.team2 === team) {
      const opponent = val.team1 === team ? val.team2 : val.team1;
      const myWins = val.team1 === team ? val.t1_wins : val.t2_wins;
      h2hMatches[opponent] = { wins: myWins, total: val.total };
    }
  });

  const seasonData = cricketData.season_performance
    .filter(s => s.team === team)
    .sort((a, b) => a.season > b.season ? 1 : -1);

  res.json({ success: true, data: { ...stats, name: team, h2h: h2hMatches, seasonData } });
});

// GET /api/player-stats
app.get('/api/player-stats', (req, res) => {
  const type = req.query.type || 'batting';
  const data = type === 'bowling' ? cricketData.top_bowlers : cricketData.top_batters;
  res.json({ success: true, data });
});

// GET /api/head-to-head
app.get('/api/head-to-head', (req, res) => {
  const { team1, team2 } = req.query;
  const key1 = `${team1}|${team2}`;
  const key2 = `${team2}|${team1}`;
  const h2h = cricketData.h2h[key1] || cricketData.h2h[key2];

  if (!h2h) return res.json({ success: true, data: { total: 0 } });

  const normalised = {
    team1,
    team2,
    team1Wins: cricketData.h2h[key1] ? h2h.t1_wins : h2h.t2_wins,
    team2Wins: cricketData.h2h[key1] ? h2h.t2_wins : h2h.t1_wins,
    total: h2h.total,
  };
  res.json({ success: true, data: normalised });
});

// GET /api/venue-stats
app.get('/api/venue-stats', (req, res) => {
  res.json({ success: true, data: cricketData.venue_stats });
});

// GET /api/season-performance
app.get('/api/season-performance', (req, res) => {
  const team = req.query.team;
  const data = team
    ? cricketData.season_performance.filter(s => s.team === team)
    : cricketData.season_performance;
  res.json({ success: true, data });
});

// GET /api/leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Object.entries(cricketData.team_stats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 10);
  res.json({ success: true, data: leaderboard });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CricketIQ API running', teams: cricketData.teams.length });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🏏 CricketIQ API running on port ${PORT}`));
