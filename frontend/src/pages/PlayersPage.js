import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TOP_BATTERS, TOP_BOWLERS } from '../utils/constants';

const TOOLTIP_STYLE = { background: '#0e1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e8eaf6' };

const MEDALS = ['🥇', '🥈', '🥉'];

export default function PlayersPage() {
  const [tab, setTab] = useState('batting');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const batChartData = TOP_BATTERS.slice(0, 10).map(b => ({ name: b.batter.split(' ').pop(), runs: b.runs }));
  const bowlChartData = TOP_BOWLERS.slice(0, 10).map(b => ({ name: b.bowler.split(' ').pop(), wickets: b.wickets }));
  const player = selectedPlayer
    ? (tab === 'batting' ? TOP_BATTERS.find(b => b.batter === selectedPlayer) : TOP_BOWLERS.find(b => b.bowler === selectedPlayer))
    : null;

  return (
    <div className="fade-up">
      <div className="page-title">Player Statistics</div>
      <div className="page-sub">All-time IPL performance data — 1,095 matches, 2008–2024</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['batting', '🏏 Batting'], ['bowling', '🎯 Bowling']].map(([key, label]) => (
          <button key={key} className={`btn-secondary ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setSelectedPlayer(null); }}>
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 14 }}>
          {tab === 'batting' ? 'Top 10 Run Scorers' : 'Top 10 Wicket Takers'}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={tab === 'batting' ? batChartData : bowlChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <XAxis dataKey="name" tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(v, n) => [v.toLocaleString(), tab === 'batting' ? 'Runs' : 'Wickets']} />
            <Bar dataKey={tab === 'batting' ? 'runs' : 'wickets'}
              fill={tab === 'batting' ? '#e63946' : '#4361ee'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Table */}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>
            {tab === 'batting' ? 'Batting Leaderboard' : 'Bowling Leaderboard'}
          </div>
          <div style={{ overflowX: 'auto' }}>
            {tab === 'batting' ? (
              <table className="data-table">
                <thead><tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Player</th>
                  <th>Runs</th>
                  <th>SR</th>
                  <th>Avg</th>
                  <th>6s</th>
                  <th>Inn</th>
                </tr></thead>
                <tbody>
                  {TOP_BATTERS.map((b, i) => (
                    <tr key={b.batter} onClick={() => setSelectedPlayer(b.batter === selectedPlayer ? null : b.batter)}
                      style={{ cursor: 'pointer', background: selectedPlayer === b.batter ? 'var(--bg3)' : '' }}>
                      <td style={{ color: i < 3 ? 'var(--gold)' : 'var(--txt2)', fontSize: 13 }}>
                        {MEDALS[i] || i + 1}
                      </td>
                      <td className="fw-800" style={{ fontSize: 13 }}>{b.batter}</td>
                      <td className="mono text-orange fw-800">{b.runs.toLocaleString()}</td>
                      <td className="mono">{b.strike_rate}</td>
                      <td className="mono">{b.avg}</td>
                      <td className="mono text-blue">{b.sixes}</td>
                      <td className="mono text-muted">{b.innings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead><tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Player</th>
                  <th>Wkts</th>
                  <th>Eco</th>
                  <th>Avg</th>
                  <th>Inn</th>
                </tr></thead>
                <tbody>
                  {TOP_BOWLERS.map((b, i) => (
                    <tr key={b.bowler} onClick={() => setSelectedPlayer(b.bowler === selectedPlayer ? null : b.bowler)}
                      style={{ cursor: 'pointer', background: selectedPlayer === b.bowler ? 'var(--bg3)' : '' }}>
                      <td style={{ color: i < 3 ? 'var(--gold)' : 'var(--txt2)', fontSize: 13 }}>
                        {MEDALS[i] || i + 1}
                      </td>
                      <td className="fw-800" style={{ fontSize: 13 }}>{b.bowler}</td>
                      <td className="mono text-blue fw-800">{b.wickets}</td>
                      <td className="mono">{b.economy}</td>
                      <td className="mono">{b.avg}</td>
                      <td className="mono text-muted">{b.innings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Player detail card */}
        {player ? (
          <div className="card-glow fade-in">
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              {tab === 'batting' ? player.batter : player.bowler}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 20 }}>IPL Career Statistics</div>

            {tab === 'batting' ? (
              <div>
                <div className="grid-2" style={{ gap: 10, marginBottom: 14 }}>
                  {[
                    { l: 'Total Runs', v: player.runs.toLocaleString(), c: 'var(--orange)' },
                    { l: 'Strike Rate', v: player.strike_rate, c: 'var(--green)' },
                    { l: 'Average', v: player.avg, c: 'var(--blue)' },
                    { l: 'Innings', v: player.innings, c: 'var(--txt)' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="stat-chip">
                      <div className="stat-chip-val" style={{ color: c }}>{v}</div>
                      <div className="stat-chip-lbl">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <div className="stat-chip">
                    <div className="stat-chip-val" style={{ color: 'var(--red)' }}>{player.fours}</div>
                    <div className="stat-chip-lbl">Fours</div>
                  </div>
                  <div className="stat-chip">
                    <div className="stat-chip-val" style={{ color: 'var(--purple)' }}>{player.sixes}</div>
                    <div className="stat-chip-lbl">Sixes</div>
                  </div>
                </div>
                {/* Boundary % */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 6 }}>Boundary Contribution</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round(((player.fours * 4 + player.sixes * 6) / player.runs) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>
                    {Math.round(((player.fours * 4 + player.sixes * 6) / player.runs) * 100)}% of runs from boundaries
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid-2" style={{ gap: 10, marginBottom: 14 }}>
                  {[
                    { l: 'Wickets', v: player.wickets, c: 'var(--blue)' },
                    { l: 'Economy', v: player.economy, c: 'var(--orange)' },
                    { l: 'Average', v: player.avg || 'N/A', c: 'var(--green)' },
                    { l: 'Innings', v: player.innings, c: 'var(--txt)' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="stat-chip">
                      <div className="stat-chip-val" style={{ color: c }}>{v}</div>
                      <div className="stat-chip-lbl">{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 6 }}>Economy Rating</div>
                  <div className="progress-bar">
                    <div style={{ height: '100%', background: player.economy < 7.5 ? 'var(--green)' : player.economy < 8.5 ? 'var(--orange)' : 'var(--red)', borderRadius: 3, width: `${Math.min(100, (12 - player.economy) / 6 * 100)}%`, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4 }}>
                    {player.economy < 7.0 ? 'Elite economy' : player.economy < 8.0 ? 'Good economy' : 'Average economy'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--txt2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
            <div style={{ fontSize: 14 }}>Click any player to see detailed stats</div>
          </div>
        )}
      </div>
    </div>
  );
}
