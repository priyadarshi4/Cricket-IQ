import { TEAM_STATS, H2H_DATA, SEASON_DATA } from './constants';

function getH2HRate(team1, team2) {
  const k1 = `${team1}|${team2}`;
  const k2 = `${team2}|${team1}`;
  const h2h = H2H_DATA[k1] || H2H_DATA[k2];
  if (!h2h || h2h.total === 0) return 0.5;
  const t1wins = H2H_DATA[k1] ? h2h.t1_wins : h2h.t2_wins;
  return t1wins / h2h.total;
}


function getRecentForm(team, n = 5) {
  const data = SEASON_DATA[team];
  if (!data || data.length === 0) return 0.5;
  const last = data.slice(-3);
  const totalWins = last.reduce((s, x) => s + x.w, 0);
  const totalMatches = last.reduce((s, x) => s + x.m, 0);
  return totalMatches > 0 ? totalWins / totalMatches : 0.5;
}

export function runPrediction({ team1, team2, venue, tossWinner, tossDecision, matchType }) {
  const s1 = TEAM_STATS[team1] || { win_rate: 50, avg_score: 155, wins: 0, total_matches: 1 };
  const s2 = TEAM_STATS[team2] || { win_rate: 50, avg_score: 155, wins: 0, total_matches: 1 };

  const h2hRate = getH2HRate(team1, team2);
  const form1 = getRecentForm(team1);
  const form2 = getRecentForm(team2);
  const scorePow = s1.avg_score / (s1.avg_score + s2.avg_score);
  const wrComp = s1.win_rate / (s1.win_rate + s2.win_rate);
  const tossAdv = tossWinner === team1 ? 1 : 0;
  const tossBat = tossDecision === 'bat' ? 1 : 0;
  const playoffBoost = matchType === 'final' ? 0.02 : matchType === 'playoff' ? 0.01 : 0;
  // Small deterministic venue seed so same venue always gives same tiny offset
  const venueOffset = (venue.charCodeAt(0) % 10 - 5) * 0.003;

  const raw =
    h2hRate * 0.22 +
    scorePow * 0.25 +
    wrComp * 0.26 +
    form1 * 0.08 +
    (1 - form2) * 0.05 +
    tossAdv * 0.07 +
    tossBat * tossAdv * 0.04 +
    playoffBoost +
    venueOffset;

  const logit = (raw - 0.5) * 6;
  const prob = 1 / (1 + Math.exp(-logit));
  const p1 = Math.min(0.84, Math.max(0.16, prob));
  const confidence = Math.min(97, Math.round(50 + Math.abs(p1 - 0.5) * 100));

  // Build explainable factors
  const factors = [];

  if (h2hRate > 0.55)
    factors.push({ label: 'Head-to-Head Dominance', impact: 'positive', value: `${Math.round(h2hRate * 100)}% H2H win rate`, weight: 22, icon: '⚔️' });
  else if (h2hRate < 0.45)
    factors.push({ label: `H2H Disadvantage vs ${team2}`, impact: 'negative', value: `Only ${Math.round(h2hRate * 100)}% H2H wins`, weight: 22, icon: '⚔️' });
  else
    factors.push({ label: 'Evenly Matched H2H', impact: 'neutral', value: `${Math.round(h2hRate * 100)}% H2H parity`, weight: 22, icon: '⚔️' });

  if (s1.avg_score > s2.avg_score + 5)
    factors.push({ label: 'Batting Firepower Lead', impact: 'positive', value: `Avg ${Math.round(s1.avg_score)} vs ${Math.round(s2.avg_score)}`, weight: 25, icon: '🏏' });
  else if (s2.avg_score > s1.avg_score + 5)
    factors.push({ label: 'Lower Batting Firepower', impact: 'negative', value: `Avg ${Math.round(s1.avg_score)} vs ${Math.round(s2.avg_score)}`, weight: 25, icon: '🏏' });

  if (s1.win_rate > s2.win_rate + 4)
    factors.push({ label: 'Historical Win Rate Lead', impact: 'positive', value: `${s1.win_rate}% vs ${s2.win_rate}%`, weight: 18, icon: '📈' });
  else if (s2.win_rate > s1.win_rate + 4)
    factors.push({ label: 'Lower Historical Win Rate', impact: 'negative', value: `${s1.win_rate}% vs ${s2.win_rate}%`, weight: 18, icon: '📈' });

  if (form1 > 0.6)
    factors.push({ label: 'Strong Recent Form', impact: 'positive', value: `${Math.round(form1 * 100)}% recent win rate`, weight: 8, icon: '🔥' });
  else if (form1 < 0.4)
    factors.push({ label: 'Poor Recent Form', impact: 'negative', value: `${Math.round(form1 * 100)}% recent win rate`, weight: 8, icon: '❄️' });

  if (tossAdv) {
    factors.push({
      label: tossBat ? 'Toss Win — Chose to Bat' : 'Toss Win — Chose to Field',
      impact: 'positive',
      value: tossBat ? 'Setting the target' : 'Chasing the target',
      weight: tossBat ? 9 : 7,
      icon: '🪙',
    });
  }

  if (matchType === 'final')
    factors.push({ label: 'Final Match Pressure', impact: 'neutral', value: 'High-stakes elimination', weight: 2, icon: '🏆' });

  return {
    team1, team2,
    team1Probability: Math.round(p1 * 100),
    team2Probability: Math.round((1 - p1) * 100),
    predictedWinner: p1 >= 0.5 ? team1 : team2,
    confidence,
    factors: factors.slice(0, 5),
    modelBreakdown: {
      'H2H Record': Math.round(h2hRate * 100),
      'Scoring Power': Math.round(scorePow * 100),
      'Win Rate Index': Math.round(wrComp * 100),
      'Form Factor': Math.round(form1 * 100),
      'Venue Fit': Math.round(50 + venueOffset * 100),
      'Toss Impact': tossAdv ? (tossBat ? 9 : 7) : 0,
    },
    raw: { s1, s2, h2hRate, form1, form2, scorePow, wrComp },
  };
}
