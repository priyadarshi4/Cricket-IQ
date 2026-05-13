import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePredictionHistory } from '../context/PredictionHistory';
import { TEAM_ABBR } from '../utils/constants';
import EmptyState from '../components/EmptyState';

function AccuracyRing({ pct, size = 80 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 60 ? '#00c49a' : pct >= 50 ? '#f77f00' : '#e63946';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontFamily="var(--font-head)" fontSize={size*0.18} fontWeight="800">
        {pct}%
      </text>
    </svg>
  );
}


export default function HistoryPage() {
  const { history, clearHistory } = usePredictionHistory();
  const [filter, setFilter] = useState('all');

  const filtered = history.filter(h => {
    if (filter === 'high') return h.confidence >= 65;
    if (filter === 'low')  return h.confidence < 55;
    return true;
  });

  // Stats
  const total = history.length;
  const avgConf = total ? Math.round(history.reduce((s, h) => s + h.confidence, 0) / total) : 0;
  const highConf = history.filter(h => h.confidence >= 65).length;
  const teamCounts = {};
  history.forEach(h => {
    teamCounts[h.predictedWinner] = (teamCounts[h.predictedWinner] || 0) + 1;
  });
  const mostPredicted = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Prediction History</div>
          <div className="page-sub">Your last {total} predictions — stored locally in your browser</div>
        </div>
        {total > 0 && (
          <button className="btn-secondary" onClick={() => { if (window.confirm('Clear all prediction history?')) clearHistory(); }}>
            🗑 Clear History
          </button>
        )}
      </div>

      {total === 0 ? (
        <EmptyState
          icon="🔮"
          title="No predictions yet"
          sub="Make a prediction on the Predict page — it'll be saved here automatically."
          action={<Link to="/predict" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, textDecoration: 'none' }}>Make your first prediction →</Link>}
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--orange)' }}>{total}</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Total Predictions</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <AccuracyRing pct={avgConf} size={64} />
              <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Avg Confidence</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{highConf}</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>High-Confidence (≥65%)</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--blue)', lineHeight: 1.2, marginTop: 4 }}>
                {mostPredicted ? TEAM_ABBR[mostPredicted[0]] || mostPredicted[0] : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>Most Predicted Winner</div>
              {mostPredicted && <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{mostPredicted[1]} times</div>}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['all', 'All'], ['high', 'High Confidence (≥65%)'], ['low', 'Low Confidence (<55%)']].map(([k, l]) => (
              <button key={k} className={`btn-secondary ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>

          {/* History list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--txt2)' }}>
                No predictions match this filter.
              </div>
            ) : (
              filtered.map((h, i) => (
                <div key={h.id || i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Top accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: h.confidence >= 65 ? 'var(--green)' : h.confidence >= 55 ? 'var(--orange)' : 'var(--red)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    {/* Match info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 800 }}>
                          {TEAM_ABBR[h.team1] || h.team1}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>vs</span>
                        <span style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 800 }}>
                          {TEAM_ABBR[h.team2] || h.team2}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--txt2)', marginLeft: 4 }}>
                          · {new Date(h.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
                        Predicted: {h.predictedWinner}
                      </div>
                    </div>

                    {/* Probability pills */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>
                          {h.team1Probability}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{TEAM_ABBR[h.team1]}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>|</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
                          {h.team2Probability}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{TEAM_ABBR[h.team2]}</div>
                      </div>
                    </div>

                    {/* Confidence badge */}
                    <div style={{ textAlign: 'center', minWidth: 72 }}>
                      <span className={`badge ${h.confidence >= 65 ? 'badge-green' : h.confidence >= 55 ? 'badge-orange' : 'badge-red'}`}>
                        {h.confidence}% conf
                      </span>
                    </div>
                  </div>

                  {/* Key factor preview */}
                  {h.factors && h.factors.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {h.factors.slice(0, 3).map((f, j) => (
                        <span key={j} style={{ fontSize: 11, color: 'var(--txt2)',
                          background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4 }}>
                          {f.icon} {f.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
