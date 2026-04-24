import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { IPL_TEAMS, TEAM_ABBR } from '../utils/constants';

const TT = { background: '#0e1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e8eaf6' };


function updateProb(state) {
  const { inning, over, ball, runs, wickets, target } = state;
  const ballsUsed = over * 6 + ball;
  const ballsRem  = 120 - ballsUsed;

  if (inning === 1) {
    const rr = ballsUsed > 0 ? (runs / ballsUsed) * 6 : 8.5;
    const projected = runs + (rr * ballsRem / 6);
    const p = 0.35 + (projected - 155) * 0.004 - wickets * 0.030;
    return Math.min(0.85, Math.max(0.15, p));
  } else {
    const tgt = target || 165;
    const needed = tgt - runs;
    if (ballsRem === 0) return runs >= tgt ? 0.97 : 0.03;
    const wrr   = (needed / (ballsRem / 6));
    const winRem = 10 - wickets;
    const p = 0.5 + (8.5 - wrr) * 0.07 + (winRem - 5) * 0.025;
    return Math.min(0.94, Math.max(0.04, 1 - p));  // team1 set target, team2 chasing
  }
}

export default function LiveSimPage() {
  const [team1, setTeam1] = useState('Mumbai Indians');
  const [team2, setTeam2] = useState('Chennai Super Kings');
  const [target, setTarget] = useState(175);
  const [state,  setState]  = useState({ inning: 1, over: 0, ball: 0, runs: 0, wickets: 0 });
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const [speed,   setSpeed]   = useState(400); // ms per ball
  const intervalRef = useRef(null);

  // Simulate one ball
  const simBall = useCallback(() => {
    setState(prev => {
      if (prev.inning === 2 && (prev.runs >= target || prev.wickets >= 10 || (prev.over >= 19 && prev.ball >= 5))) return prev;
      if (prev.inning === 1 && prev.over >= 20) return prev;

      // Random delivery outcome
      const r = Math.random();
      let runs_added  = 0;
      let wkt = 0;
      const wicketChance = 0.067 + prev.wickets * 0.004;
      if (r < wicketChance)               { wkt = 1; }
      else if (r < wicketChance + 0.28)   { runs_added = 0; }
      else if (r < wicketChance + 0.45)   { runs_added = 1; }
      else if (r < wicketChance + 0.57)   { runs_added = 2; }
      else if (r < wicketChance + 0.60)   { runs_added = 3; }
      else if (r < wicketChance + 0.73)   { runs_added = 4; }
      else                                 { runs_added = 6; }

      const newRuns    = prev.runs    + runs_added;
      const newWickets = prev.wickets + wkt;
      let   newBall    = prev.ball    + 1;
      let   newOver    = prev.over;
      let   newInning  = prev.inning;

      if (newBall >= 6) { newBall = 0; newOver += 1; }

      // End of innings
      if (newInning === 1 && newOver >= 20) {
        setTarget(newRuns + 1);
        newInning = 2;
        newOver   = 0; newBall = 0;
        setState({ inning: 2, over: 0, ball: 0, runs: 0, wickets: 0 });
        return { inning: 2, over: 0, ball: 0, runs: 0, wickets: 0 };
      }

      const ns = { inning: newInning, over: newOver, ball: newBall, runs: newRuns, wickets: newWickets };
      const prob = updateProb({ ...ns, target: newInning === 2 ? target : undefined });

      setHistory(h => [...h, {
        label: `${prev.over}.${prev.ball}`,
        team1Prob: Math.round(prob * 100),
        team2Prob: Math.round((1 - prob) * 100),
        runs: newRuns,
        wkt:  wkt,
        runsAdded: runs_added,
        inning: newInning,
      }].slice(-80));

      return ns;
    });
  }, [target]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(simBall, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, speed, simBall]);

  const resetSim = () => {
    setRunning(false);
    setState({ inning: 1, over: 0, ball: 0, runs: 0, wickets: 0 });
    setHistory([]);
    setTarget(175);
  };

  const currentProb = history.length > 0 ? history[history.length - 1].team1Prob : 50;
  const t1 = TEAM_ABBR[team1] || team1;
  const t2 = TEAM_ABBR[team2] || team2;

  const lastBalls = history.slice(-6);

  return (
    <div className="fade-up">
      <div className="page-title">Live Match Simulator</div>
      <div className="page-sub">Ball-by-ball win probability simulation using DLS-style model</div>

      {/* Setup */}
      <div className="card-glow" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
          <div className="field-group">
            <div className="field-label">Team 1 (Batting 1st)</div>
            <select value={team1} onChange={e => setTeam1(e.target.value)} disabled={running}>
              {IPL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 6, fontFamily: 'var(--font-head)', fontWeight: 800, color: 'var(--orange)', fontSize: 18 }}>VS</div>
          <div className="field-group">
            <div className="field-label">Team 2 (Chasing)</div>
            <select value={team2} onChange={e => setTeam2(e.target.value)} disabled={running}>
              {IPL_TEAMS.filter(t => t !== team1).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field-group">
            <div className="field-label">Sim Speed</div>
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
              <option value={800}>Slow</option>
              <option value={400}>Normal</option>
              <option value={150}>Fast</option>
              <option value={50}>Ultra</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setRunning(r => !r)} style={{ flex: 1 }}>
            {running ? '⏸ Pause' : history.length ? '▶ Resume' : '▶ Start Simulation'}
          </button>
          <button className="btn-secondary" onClick={resetSim}>↺ Reset</button>
          <button className="btn-secondary" onClick={simBall} disabled={running}>+1 Ball</button>
        </div>
      </div>

      {/* Live Scoreboard */}
      <div className="card-glow" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t1}</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--red)' }}>{currentProb}%</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Win probability</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Innings {state.inning} — Over {state.over}.{state.ball}
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>
              {state.runs}/{state.wickets}
            </div>
            {state.inning === 2 && (
              <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 2 }}>
                Need {Math.max(0, target - state.runs)} off {120 - state.over * 6 - state.ball} balls
              </div>
            )}
            {state.inning === 1 && (
              <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
                RR: {state.over > 0 ? ((state.runs / (state.over * 6 + state.ball)) * 6).toFixed(2) : '—'}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t2}</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--blue)' }}>{100 - currentProb}%</div>
            <div style={{ fontSize: 11, color: 'var(--txt2)' }}>Win probability</div>
          </div>
        </div>
      </div>

      {/* Probability Chart */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Win Probability Timeline</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
              <XAxis dataKey="label" tick={{ fill: '#8892b0', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.floor(history.length / 10)} />
              <YAxis tick={{ fill: '#8892b0', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={TT} formatter={(v, n) => [`${v}%`, n]} />
              <ReferenceLine y={50} stroke="#4a5568" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="team1Prob" stroke="#e63946" strokeWidth={2}
                dot={false} name={t1} isAnimationActive={false} />
              <Line type="monotone" dataKey="team2Prob" stroke="#4361ee" strokeWidth={2}
                dot={false} name={t2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#e63946', display: 'inline-block' }} />{t1}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#4361ee', display: 'inline-block' }} />{t2}</span>
          </div>
        </div>
      )}

      {/* Last 6 balls */}
      {lastBalls.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Last {lastBalls.length} Deliveries</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {lastBalls.map((b, i) => (
              <div key={i} style={{
                width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', fontWeight: 800, fontFamily: 'var(--font-head)',
                background: b.wkt ? 'rgba(230,57,70,0.15)' : b.runsAdded === 6 ? 'rgba(67,97,238,0.15)' : b.runsAdded === 4 ? 'rgba(247,127,0,0.15)' : 'var(--bg3)',
                border: `2px solid ${b.wkt ? 'var(--red)' : b.runsAdded === 6 ? 'var(--blue)' : b.runsAdded === 4 ? 'var(--orange)' : 'var(--border)'}`,
              }}>
                <div style={{ fontSize: 16, color: b.wkt ? 'var(--red)' : b.runsAdded >= 4 ? 'var(--orange)' : 'var(--txt)' }}>
                  {b.wkt ? 'W' : b.runsAdded}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt2)' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
