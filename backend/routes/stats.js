const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/cricket_data.json'), 'utf8'));

// GET /api/teams
router.get('/teams', (req, res) => {
  const teams = data.teams.map(name => ({
    name,
    abbr: teamAbbr(name),
    ...data.team_stats[name],
  }));
  res.json({ success: true, data: teams });
});

// GET /api/teams/:name//
router.get('/teams/:name', (req, res) => {
  const name  = decodeURIComponent(req.params.name);
  const stats = data.team_stats[name];
  if (!stats) return res.status(404).json({ success: false, message: 'Team not found' });

  // Build H2H map for this team
  const h2h = {};
  Object.entries(data.h2h).forEach(([key, val]) => {
    if (key.includes(name)) {
      const opp   = key.startsWith(name) ? key.split('|')[1] : key.split('|')[0];
      const myW   = key.startsWith(name) ? val.t1_wins : val.t2_wins;
      h2h[opp]    = { wins: myW, losses: val.total - myW, total: val.total };
    }
  });

  const seasonData = data.season_performance
    .filter(s => s.team === name)
    .sort((a, b) => a.season > b.season ? 1 : -1);

  res.json({ success: true, data: { name, abbr: teamAbbr(name), ...stats, h2h, seasonData } });
});

// GET /api/players?type=batting&limit=20
router.get('/players', (req, res) => {
  const type  = req.query.type || 'batting';
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const raw   = type === 'bowling' ? data.top_bowlers : data.top_batters;
  res.json({ success: true, data: raw.slice(0, limit) });
});

// GET /api/venues
router.get('/venues', (req, res) => {
  res.json({ success: true, data: data.venues });
});

// GET /api/venue-stats
router.get('/venue-stats', (req, res) => {
  res.json({ success: true, data: data.venue_stats });
});

// GET /api/leaderboard
router.get('/leaderboard', (req, res) => {
  const lb = Object.entries(data.team_stats)
    .map(([name, s]) => ({ name, abbr: teamAbbr(name), ...s }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 10);
  res.json({ success: true, data: lb });
});

// GET /api/h2h?team1=X&team2=Y
router.get('/h2h', (req, res) => {
  const { team1, team2 } = req.query;
  const k1 = `${team1}|${team2}`, k2 = `${team2}|${team1}`;
  const raw = data.h2h[k1] || data.h2h[k2];
  if (!raw) return res.json({ success: true, data: { total: 0 } });
  const norm = {
    team1, team2,
    team1Wins: data.h2h[k1] ? raw.t1_wins : raw.t2_wins,
    team2Wins: data.h2h[k1] ? raw.t2_wins : raw.t1_wins,
    total: raw.total,
  };
  res.json({ success: true, data: norm });
});

// GET /api/recent-matches?limit=20
router.get('/recent-matches', (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  res.json({ success: true, data: data.recent_matches.slice(-limit).reverse() });
});

// GET /api/season-performance?team=X
router.get('/season-performance', (req, res) => {
  const { team } = req.query;
  const sp = team
    ? data.season_performance.filter(s => s.team === team)
    : data.season_performance;
  res.json({ success: true, data: sp });
});

function teamAbbr(name) {
  const m = { 'Mumbai Indians':'MI','Chennai Super Kings':'CSK','Kolkata Knight Riders':'KKR',
    'Sunrisers Hyderabad':'SRH','Rajasthan Royals':'RR','Delhi Capitals':'DC',
    'Gujarat Titans':'GT','Punjab Kings':'PBKS','Royal Challengers Bangalore':'RCB',
    'Royal Challengers Bengaluru':'RCB','Lucknow Super Giants':'LSG' };
  return m[name] || name.split(' ').map(w => w[0]).join('').slice(0, 3);
}

module.exports = router;
