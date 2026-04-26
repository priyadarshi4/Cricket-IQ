import React from 'react';
import { Link } from 'react-router-dom';
import { TEAM_STATS, RECENT_RESULTS, TEAM_ABBR, TOP_BATTERS, TOP_BOWLERS } from '../utils/constants';

const statCards = [
  { label: 'IPL Matches Analyzed', value: '1,095', color: '#e63946', icon: '📊' },
  { label: 'Ball-by-Ball Deliveries', value: '260,920', color: '#f77f00', icon: '🏏' },
  { label: 'ML Model Accuracy', value: '58.7%', color: '#4361ee', icon: '🤖' },
  { label: 'IPL Seasons Covered', value: '17', color: '#00c49a', icon: '🏆' },
];

export default function HomePage() {
  const leaderboard = Object.entries(TEAM_STATS)
    .filter(([, s]) => s.total_matches >= 40)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 5);

  return (
    <div className="fade-up">
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 0 32px' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--orange)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
          Powered by Ensemble Machine Learning
        </div>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
          Predict IPL Match<br />
          <span style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Outcomes with AI
          </span>
        </h1>
        <p style={{ color: 'var(--txt2)', fontSize: 16, maxWidth: 480, margin: '0 auto 28px' }}>
          Built on 1,095 matches and 260,920 deliveries. Ensemble model combining Random Forest, XGBoost, LightGBM, and Logistic Regression.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/predict" className="btn-primary">⚡ Predict a Match</Link>
          <Link to="/analytics" className="btn-secondary">View Analytics →</Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map(c => (
          <div key={c.label} className="card-glow" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        {/* Recent Results */}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>Recent Results</div>
          {RECENT_RESULTS.slice(0, 6).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{TEAM_ABBR[m.team1] || m.team1}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>vs</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{TEAM_ABBR[m.team2] || m.team2}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{m.venue.split(',')[0]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{TEAM_ABBR[m.winner] || m.winner} won</div>
                <div style={{ fontSize: 11, color: 'var(--txt2)' }}>by {m.margin}</div>
              </div>
            </div>
          ))}
          <Link to="/analytics" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>
            View all results →
          </Link>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>Win Rate Leaderboard</div>
          {leaderboard.map((t, i) => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: i < 3 ? 'var(--gold)' : 'var(--txt2)', width: 20 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{TEAM_ABBR[t.name] || t.name} — <span style={{ color: 'var(--txt2)', fontWeight: 400 }}>{t.name}</span></div>
                <div className="progress-bar" style={{ width: '100%' }}>
                  <div className="progress-fill" style={{ width: `${t.win_rate}%` }} />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--green)', minWidth: 44, textAlign: 'right' }}>
                {t.win_rate}%
              </div>
            </div>
          ))}
          <Link to="/teams" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>
            All teams →
          </Link>
        </div>
      </div>

      {/* Top performers strip */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>All-Time Top Performers</div>
        <div className="grid-2">
          <div>
            <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700, marginBottom: 10 }}>🏏 TOP BATTERS</div>
            {TOP_BATTERS.slice(0, 5).map((b, i) => (
              <div key={b.batter} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--txt2)', width: 20 }}>{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{b.batter}</span>
                <span className="mono text-orange">{b.runs.toLocaleString()}</span>
                <span className="mono text-muted" style={{ marginLeft: 12 }}>SR {b.strike_rate}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700, marginBottom: 10 }}>🎯 TOP BOWLERS</div>
            {TOP_BOWLERS.slice(0, 5).map((b, i) => (
              <div key={b.bowler} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--txt2)', width: 20 }}>{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{b.bowler}</span>
                <span className="mono text-blue">{b.wickets}w</span>
                <span className="mono text-muted" style={{ marginLeft: 12 }}>Eco {b.economy}</span>
              </div>
            ))}
          </div>
        </div>
        <Link to="/players" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>
          Full player stats →
        </Link>
      </div>

      {/* Model info */}
      <div className="card-glow">
        <div className="section-label" style={{ marginBottom: 12 }}>About the ML Model</div>
        <div className="grid-3">
          {[
            { title: 'Ensemble of 4 Models', desc: 'Random Forest · XGBoost · LightGBM · Logistic Regression with soft voting and weighted averaging.' },
            { title: '10 Engineered Features', desc: 'H2H win rate · Team form · Venue win rate · Scoring power · Toss impact · City factor · Season context.' },
            { title: 'Real IPL Data', desc: '1,095 matches from 2008–2024 with 17 seasons of ball-by-ball data from the official IPL dataset.' },
          ].map(({ title, desc }) => (
            <div key={title}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--orange)' }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
