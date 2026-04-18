import React from 'react';
import { Link } from 'react-router-dom';
import TeamBadge from './TeamBadge';
import { TEAM_ABBR } from '../utils/constants';

/**
 * MatchCard — displays a single match (result or upcoming).
 * Props:
 *   match        — { team1, team2, winner, venue, date, result, result_margin, season }
 *   compact      — boolean, smaller layout
 *   showPredict  — show "Predict" CTA button
 */
export default function MatchCard({ match, compact = false, showPredict = false }) {
  if (!match) return null;
  const { team1, team2, winner, venue, date, result_margin, season } = match;
  const isResult = Boolean(winner);

  return (
    <div style={{
      background:   'var(--bg2)',
      border:       '1px solid var(--border)',
      borderRadius: 12,
      padding:      compact ? '12px 14px' : '16px',
      position:     'relative',
      overflow:     'hidden',
      transition:   'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Top strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isResult ? 'var(--grad)' : 'var(--grad2)',
      }} />

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-mono)' }}>
          {date} {season ? `· IPL ${season}` : ''}
        </span>
        {isResult
          ? <span className="badge badge-green" style={{ fontSize: 10 }}>RESULT</span>
          : <span className="badge badge-orange" style={{ fontSize: 10 }}>UPCOMING</span>
        }
      </div>

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <TeamBadge name={team1} size={compact ? 'sm' : 'md'} />
        <span style={{ color: 'var(--txt3)', fontSize: 11, fontWeight: 700 }}>vs</span>
        <TeamBadge name={team2} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Venue */}
      <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: isResult ? 8 : 0 }}>
        📍 {venue ? venue.split(',')[0] : '—'}
      </div>

      {/* Result */}
      {isResult && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>
            {TEAM_ABBR[winner] || winner} won
          </span>
          {result_margin && (
            <span style={{ color: 'var(--txt2)' }}>by {result_margin}</span>
          )}
        </div>
      )}

      {/* CTA */}
      {showPredict && (
        <Link
          to={`/predict?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`}
          style={{
            display: 'block', marginTop: 10, textAlign: 'center',
            padding: '7px', borderRadius: 6,
            background: 'var(--bg4)', border: '1px solid var(--border2)',
            color: 'var(--orange)', fontSize: 12, fontWeight: 700, textDecoration: 'none',
            transition: 'background 0.2s',
          }}
        >
          ⚡ Predict this match
        </Link>
      )}
    </div>
  );
}
