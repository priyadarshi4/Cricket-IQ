import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { TEAM_STATS, TEAM_ABBR, IPL_TEAMS, H2H_DATA, SEASON_DATA, FEATURE_IMPORTANCE, RECENT_RESULTS } from '../utils/constants';

const TT = { background: '#0e1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e8eaf6' };

const PIE_COLORS = ['#e63946','#f77f00','#4361ee','#00c49a','#7b5ea7','#ffd700','#ff6b6b','#48cae4'];

export default function AnalyticsPage() {
  const [h2hT1, setH2HT1] = useState('Mumbai Indians');
  const [h2hT2, setH2HT2] = useState('Chennai Super Kings');
  const [seasonTeam, setSeasonTeam] = useState('Mumbai Indians');

  // Win Rate bar data//
  const wrData = IPL_TEAMS
    .filter(t => TEAM_STATS[t] && TEAM_STATS[t].total_matches >= 40)
    .map(t => ({ team: TEAM_ABBR[t] || t, wr: TEAM_STATS[t].win_rate, matches: TEAM_STATS[t].total_matches }))
    .sort((a, b) => b.wr - a.wr);

  // Avg score data
  const scoreData = IPL_TEAMS
    .filter(t => TEAM_STATS[t] && TEAM_STATS[t].total_matches >= 40)
    .map(t => ({ team: TEAM_ABBR[t] || t, score: TEAM_STATS[t].avg_score }))
    .sort((a, b) => b.score - a.score);

  // Season trend for selected team
  const sData = SEASON_DATA[seasonTeam] || [];

  // H2H lookup
  const h2hKey1 = `${h2hT1}|${h2hT2}`;
  const h2hKey2 = `${h2hT2}|${h2hT1}`;
  const h2hRaw = H2H_DATA[h2hKey1] || H2H_DATA[h2hKey2];
  const h2h = h2hRaw ? {
    t1wins: H2H_DATA[h2hKey1] ? h2hRaw.t1_wins : h2hRaw.t2_wins,
    t2wins: H2H_DATA[h2hKey1] ? h2hRaw.t2_wins : h2hRaw.t1_wins,
    total: h2hRaw.total,
  } : null;

  // Feature importance
  const fiData = Object.entries(FEATURE_IMPORTANCE).map(([k, v]) => ({ name: k, value: v }));

  // Radar: compare two teams
  const radarData = ['win_rate', 'avg_score'].includes('win_rate')
    ? ['Win Rate', 'Avg Score', 'Total Wins', 'Win Momentum'].map(attr => {
        const s1 = TEAM_STATS[h2hT1] || {};
        const s2 = TEAM_STATS[h2hT2] || {};
        const normalize = (v, min, max) => Math.round(((v - min) / (max - min)) * 100);
        return {
          attr,
          [TEAM_ABBR[h2hT1]]: attr === 'Win Rate' ? s1.win_rate : attr === 'Avg Score' ? normalize(s1.avg_score, 150, 200) : attr === 'Total Wins' ? normalize(s1.wins, 0, 200) : normalize(s1.win_rate, 40, 65),
          [TEAM_ABBR[h2hT2]]: attr === 'Win Rate' ? s2.win_rate : attr === 'Avg Score' ? normalize(s2.avg_score, 150, 200) : attr === 'Total Wins' ? normalize(s2.wins, 0, 200) : normalize(s2.win_rate, 40, 65),
        };
      })
    : [];

  return (
    <div className="fade-up">
      <div className="page-title">Analytics Dashboard</div>
      <div className="page-sub">Data-driven insights from 17 IPL seasons</div>

      {/* Win Rate & Avg Score side by side */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>All-Time Win Rates</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wrData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#8892b0', fontSize: 10 }} tickLine={false} axisLine={false} domain={[35, 70]} />
              <YAxis type="category" dataKey="team" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [`${v}%`, 'Win Rate']} />
              <Bar dataKey="wr" fill="#e63946" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>Average Score per Innings</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#8892b0', fontSize: 10 }} tickLine={false} axisLine={false} domain={[140, 200]} />
              <YAxis type="category" dataKey="team" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [v, 'Avg Score']} />
              <Bar dataKey="score" fill="#4361ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Season Performance Trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="section-label">Season Win Rate Trend</div>
          <select value={seasonTeam} onChange={e => setSeasonTeam(e.target.value)} style={{ width: 200 }}>
            {Object.keys(SEASON_DATA).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sData.map(d => ({ ...d, wr: Math.round((d.w / d.m) * 100) }))} margin={{ top: 5, right: 20, bottom: 5, left: -15 }}>
            <XAxis dataKey="s" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TT} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} formatter={(v) => [`${v}%`, 'Win Rate']} />
            <Line type="monotone" dataKey="wr" stroke="#f77f00" strokeWidth={2.5} dot={{ r: 4, fill: '#f77f00', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* H2H Section */}
      <div className="card-glow" style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Head-to-Head Comparison</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 20 }}>
          <div className="field-group">
            <div className="field-label">Team 1</div>
            <select value={h2hT1} onChange={e => setH2HT1(e.target.value)}>
              {IPL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'center', paddingBottom: 6, fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>H2H</div>
          <div className="field-group">
            <div className="field-label">Team 2</div>
            <select value={h2hT2} onChange={e => setH2HT2(e.target.value)}>
              {IPL_TEAMS.filter(t => t !== h2hT1).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {h2h ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: 'var(--red)' }}>{TEAM_ABBR[h2hT1]}: {h2h.t1wins} wins</span>
              <span style={{ color: 'var(--txt2)', fontSize: 13 }}>{h2h.total} matches</span>
              <span style={{ color: 'var(--blue)' }}>{h2h.t2wins} wins: {TEAM_ABBR[h2hT2]}</span>
            </div>
            <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
              <div style={{ width: `${(h2h.t1wins / h2h.total) * 100}%`, background: 'var(--red)', transition: 'width 0.8s ease' }} />
              <div style={{ flex: 1, background: 'var(--blue)' }} />
            </div>

            {/* Radar chart */}
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="attr" tick={{ fill: '#8892b0', fontSize: 11 }} />
                <Radar name={TEAM_ABBR[h2hT1]} dataKey={TEAM_ABBR[h2hT1]} stroke="#e63946" fill="#e63946" fillOpacity={0.2} />
                <Radar name={TEAM_ABBR[h2hT2]} dataKey={TEAM_ABBR[h2hT2]} stroke="#4361ee" fill="#4361ee" fillOpacity={0.2} />
                <Legend formatter={(v) => <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{v}</span>} />
                <Tooltip contentStyle={TT} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--txt2)', fontSize: 13 }}>
            No H2H data available for this matchup.
          </div>
        )}
      </div>

      {/* Feature Importance + Pie */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>ML Feature Importance</div>
          {fiData.map(({ name, value }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--txt2)', width: 170, flexShrink: 0 }}>{name}</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div style={{ height: '100%', background: 'var(--grad2)', borderRadius: 3, width: `${(value / 22) * 100}%`, transition: 'width 1s ease' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--blue)', width: 36, textAlign: 'right' }}>{value}%</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>Win Share Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={IPL_TEAMS.filter(t => TEAM_STATS[t]?.total_matches >= 40).map(t => ({ name: TEAM_ABBR[t], value: TEAM_STATS[t].wins }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {IPL_TEAMS.filter(t => TEAM_STATS[t]?.total_matches >= 40).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TT} formatter={(v) => [v, 'Wins']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Results table */}
      <div className="card">
        <div className="section-label" style={{ marginBottom: 14 }}>Recent Match Results (2024)</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>Date</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th>Winner</th>
              <th>Margin</th>
              <th>Venue</th>
            </tr></thead>
            <tbody>
              {RECENT_RESULTS.map((m, i) => (
                <tr key={i}>
                  <td className="mono text-muted">{m.date}</td>
                  <td className="fw-800" style={{ fontSize: 12 }}>{TEAM_ABBR[m.team1]}</td>
                  <td className="fw-800" style={{ fontSize: 12 }}>{TEAM_ABBR[m.team2]}</td>
                  <td><span className="badge badge-green">{TEAM_ABBR[m.winner]}</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{m.margin}</td>
                  <td style={{ fontSize: 12, color: 'var(--txt2)' }}>{m.venue.split(',')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
