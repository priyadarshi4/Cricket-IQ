import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TEAM_STATS, TEAM_ABBR, IPL_TEAMS, H2H_DATA, SEASON_DATA } from '../utils/constants';

const TOOLTIP_STYLE = { background: '#0e1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e8eaf6' };

export default function TeamsPage() {
  const [selected, setSelected] = useState(null);
   
  const stats = selected ? TEAM_STATS[selected] : null;
  const seasonData = selected ? (SEASON_DATA[selected] || []) : [];

  const h2hRows = selected
    ? Object.entries(H2H_DATA)
        .filter(([k]) => k.includes(selected))
        .map(([k, v]) => {
          const isT1 = k.startsWith(selected);
          const opp = isT1 ? k.split('|')[1] : k.split('|')[0];
          const myWins = isT1 ? v.t1_wins : v.t2_wins;
          return { opp, myWins, total: v.total, oppWins: v.total - myWins, rate: Math.round((myWins / v.total) * 100) };
        })
        .sort((a, b) => b.total - a.total)
    : [];

  return (
    <div className="fade-up">
      <div className="page-title">IPL Teams</div>
      <div className="page-sub">Full franchise stats, season history, and head-to-head records</div>

      {/* Team Grid */}
      <div className="grid-auto" style={{ marginBottom: 24 }}>
        {IPL_TEAMS.map(t => {
          const s = TEAM_STATS[t] || {};
          const isSelected = selected === t;
          return (
            <div key={t} onClick={() => setSelected(isSelected ? null : t)}
              style={{
                background: isSelected ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                borderRadius: 12, padding: '16px 14px',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
              }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isSelected ? 'var(--grad)' : 'transparent', transition: 'background 0.2s' }} />
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: isSelected ? 'var(--orange)' : 'var(--txt)' }}>
                {TEAM_ABBR[t] || t.split(' ').map(w => w[0]).join('')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', margin: '4px 0 10px', lineHeight: 1.4 }}>{t}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{s.win_rate || '—'}% WR</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{s.total_matches || 0} matches</div>
            </div>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selected && stats && (
        <div className="fade-up">
          <div className="card-glow" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 56, fontWeight: 800, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>
                {TEAM_ABBR[selected] || selected.slice(0, 3)}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800 }}>{selected}</div>
                <div style={{ fontSize: 13, color: 'var(--txt2)' }}>IPL Franchise · Since 2008</div>
              </div>
            </div>

            <div className="grid-4" style={{ marginBottom: 20 }}>
              {[
                { label: 'Matches', val: stats.total_matches, color: 'var(--txt)' },
                { label: 'Wins', val: stats.wins, color: 'var(--green)' },
                { label: 'Losses', val: stats.losses, color: 'var(--red)' },
                { label: 'Win Rate', val: stats.win_rate + '%', color: 'var(--orange)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="stat-chip">
                  <div className="stat-chip-val" style={{ color }}>{val}</div>
                  <div className="stat-chip-lbl">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>Avg Score per Match</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 38, fontWeight: 800, color: 'var(--blue)' }}>{stats.avg_score}</div>
                <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>runs per innings</div>
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 10 }}>Win/Loss Split</div>
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${stats.win_rate}%`, background: 'var(--green)' }} />
                  <div style={{ flex: 1, background: 'var(--red)' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--green)' }}>■ Wins {stats.win_rate}%</span>
                  <span style={{ color: 'var(--red)' }}>■ Losses {(100 - stats.win_rate).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Season Performance Chart */}
          {seasonData.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 14 }}>Season-by-Season Wins</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={seasonData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <XAxis dataKey="s" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [`${v} wins`, 'Wins']} />
                  <Bar dataKey="w" fill="#e63946" radius={[4, 4, 0, 0]} name="Wins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win Rate Over Seasons */}
          {seasonData.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 14 }}>Win Rate % by Season</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={seasonData.map(d => ({ ...d, wr: Math.round((d.w / d.m) * 100) }))} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <XAxis dataKey="s" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} formatter={(v) => [`${v}%`, 'Win Rate']} />
                  <Line type="monotone" dataKey="wr" stroke="#f77f00" strokeWidth={2} dot={{ r: 4, fill: '#f77f00' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* H2H Records */}
          {h2hRows.length > 0 && (
            <div className="card">
              <div className="section-label" style={{ marginBottom: 14 }}>Head-to-Head Records</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Matches</th>
                    <th>{TEAM_ABBR[selected]} Wins</th>
                    <th>Opp Wins</th>
                    <th>Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {h2hRows.map(r => (
                    <tr key={r.opp}>
                      <td className="fw-800">{TEAM_ABBR[r.opp] || r.opp}</td>
                      <td className="mono">{r.total}</td>
                      <td className="mono text-green fw-800">{r.myWins}</td>
                      <td className="mono text-red">{r.oppWins}</td>
                      <td>
                        <span className={`badge ${r.rate >= 50 ? 'badge-green' : 'badge-red'}`}>{r.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
