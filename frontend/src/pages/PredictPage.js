import React, { useState } from 'react';
import { IPL_TEAMS, IPL_VENUES, TEAM_ABBR, TEAM_STATS, FEATURE_IMPORTANCE } from '../utils/constants';
import { runPrediction } from '../utils/prediction';
import { usePredictionHistory } from '../context/PredictionHistory';
import { useToast } from '../context/ToastContext';


const IMPACT_COLORS = { positive: '#00c49a', negative: '#e63946', neutral: '#f77f00' };
const IMPACT_SIGN   = { positive: '+', negative: '−', neutral: '~' };
function ProbCircle({ label, pct, color }) {
  const deg = (pct / 100) * 360;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
        background: `conic-gradient(${color} ${deg}deg, var(--bg4) 0)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', width: 72, height: 72, borderRadius: '50%',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color }}>{pct}%</div>
        </div>
      </div>
    </div>
  );
}

function ModelBar({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--txt2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange)', fontWeight: 600 }}>{value}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [form, setForm] = useState({
    team1: '', team2: '', venue: IPL_VENUES[0],
    tossWinner: '', tossDecision: 'bat', matchType: 'league',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { addPrediction } = usePredictionHistory();
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v, ...(k === 'team1' && { tossWinner: v }) }));

  const handlePredict = () => {
    if (!form.team1 || !form.team2) { setError('Please select both teams.'); return; }
    if (form.team1 === form.team2)  { setError('Teams must be different.');   return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      try {
        const r = runPrediction({ ...form, tossWinner: form.tossWinner || form.team1 });
        setResult(r);
        addPrediction(r);
        toast.success(`Prediction saved: ${TEAM_ABBR[r.predictedWinner] || r.predictedWinner} wins (${r.confidence}% confidence)`);
      } catch (e) {
        toast.error('Prediction failed: ' + e.message);
      } finally {
        setLoading(false);
      }
    }, 680);
  };

  const s1 = TEAM_STATS[form.team1];
  const s2 = TEAM_STATS[form.team2];

  return (
    <div className="fade-up">
      <div className="page-title">Match Predictor</div>
      <div className="page-sub">Select teams and conditions — our ensemble ML model does the rest</div>

      {/* Team Selector */}
      <div className="card-glow" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'end', marginBottom: 20 }}>
          <div className="field-group">
            <div className="field-label">Team 1</div>
            <select value={form.team1} onChange={e => set('team1', e.target.value)}>
              <option value="">Select team...</option>
              {IPL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'center', paddingBottom: 4 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: 'var(--orange)', lineHeight: 1 }}>VS</div>
          </div>
          <div className="field-group">
            <div className="field-label">Team 2</div>
            <select value={form.team2} onChange={e => set('team2', e.target.value)}>
              <option value="">Select team...</option>
              {IPL_TEAMS.filter(t => t !== form.team1).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Team stat comparison strip */}
        {s1 && s2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              ['Win Rate', `${s1.win_rate}%`, `${s2.win_rate}%`, s1.win_rate > s2.win_rate],
              ['Avg Score', s1.avg_score, s2.avg_score, s1.avg_score > s2.avg_score],
              ['Total Wins', s1.wins, s2.wins, s1.wins > s2.wins],
            ].map(([label, v1, v2, t1better]) => (
              <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  <span style={{ color: t1better ? 'var(--green)' : 'var(--txt2)' }}>{v1}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>vs</span>
                  <span style={{ color: !t1better ? 'var(--green)' : 'var(--txt2)' }}>{v2}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Match conditions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="field-group">
            <div className="field-label">Venue</div>
            <select value={form.venue} onChange={e => set('venue', e.target.value)}>
              {IPL_VENUES.map(v => <option key={v} value={v}>{v.split(',')[0]}</option>)}
            </select>
          </div>
          <div className="field-group">
            <div className="field-label">Toss Winner</div>
            <select value={form.tossWinner} onChange={e => set('tossWinner', e.target.value)} disabled={!form.team1 && !form.team2}>
              <option value="">Select...</option>
              {[form.team1, form.team2].filter(Boolean).map(t => (
                <option key={t} value={t}>{TEAM_ABBR[t] || t}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <div className="field-label">Toss Decision</div>
            <select value={form.tossDecision} onChange={e => set('tossDecision', e.target.value)}>
              <option value="bat">Bat First</option>
              <option value="field">Field First</option>
            </select>
          </div>
          <div className="field-group">
            <div className="field-label">Match Type</div>
            <select value={form.matchType} onChange={e => set('matchType', e.target.value)}>
              <option value="league">League Stage</option>
              <option value="playoff">Playoff</option>
              <option value="final">Final</option>
            </select>
          </div>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>⚠ {error}</div>}

        <button className="btn-primary" onClick={handlePredict} disabled={loading || !form.team1 || !form.team2}
          style={{ width: '100%', marginTop: 16, fontSize: 16, padding: '14px' }}>
          {loading ? '⚙️ Running Models...' : '⚡ PREDICT MATCH OUTCOME'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="fade-up">
          {/* Winner Banner */}
          <div className="card-glow" style={{ marginBottom: 16, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
              Predicted Winner
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>
              {result.predictedWinner}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-green">Confidence: {result.confidence}%</span>
              <span className="badge badge-orange">Ensemble Model</span>
              {result.confidence >= 70 && <span className="badge badge-gold">High Conviction</span>}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            {/* Probability circles */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 16 }}>Win Probability</div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <ProbCircle label={TEAM_ABBR[result.team1] || result.team1} pct={result.team1Probability} color="var(--red)" />
                <ProbCircle label={TEAM_ABBR[result.team2] || result.team2} pct={result.team2Probability} color="var(--blue)" />
              </div>
            </div>

            {/* Key factors */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 12 }}>Key Factors for {TEAM_ABBR[result.team1]}</div>
              {result.factors.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < result.factors.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 15 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{f.value}</div>
                  </div>
                  <span className="badge" style={{
                    background: IMPACT_COLORS[f.impact] + '22',
                    color: IMPACT_COLORS[f.impact],
                    minWidth: 24, textAlign: 'center',
                  }}>
                    {IMPACT_SIGN[f.impact]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Model breakdown */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label" style={{ marginBottom: 14 }}>Model Score Breakdown</div>
            <div className="grid-2">
              {Object.entries(result.modelBreakdown).map(([k, v]) => (
                <ModelBar key={k} label={k} value={v} />
              ))}
            </div>
          </div>

          {/* Feature importance */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 14 }}>Feature Importance (Random Forest)</div>
            {Object.entries(FEATURE_IMPORTANCE).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--txt2)', width: 180, flexShrink: 0 }}>{k}</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div style={{ height: '100%', background: 'var(--grad2)', borderRadius: 3, width: `${(v / 22) * 100}%`, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--blue)', width: 36, textAlign: 'right' }}>{v}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
