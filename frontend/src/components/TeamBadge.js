import React from 'react';
import { TEAM_ABBR, TEAM_COLORS } from '../utils/constants';

/**
 * TeamBadge — shows a coloured pill with the team abbreviation.
 * Props:
 *   name   — full team name
 *   size   — 'sm' | 'md' | 'lg'  (default 'md')
 *   mono   — use monospace font
 *   full   — show full name instead of abbreviation
 */
export default function TeamBadge({ name, size = 'md', full = false }) {
  if (!name) return null;
  const abbr  = TEAM_ABBR[name] || name.split(' ').map(w => w[0]).join('').slice(0, 3);
  const color = TEAM_COLORS[name] || { primary: '#4361ee', secondary: '#7b5ea7' };

  const sizeMap = { sm: { fontSize: 10, padding: '2px 8px', borderRadius: 4 },
                    md: { fontSize: 12, padding: '4px 10px', borderRadius: 6 },
                    lg: { fontSize: 15, padding: '6px 14px', borderRadius: 8 } };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <span style={{
      display:         'inline-block',
      background:      color.primary + '22',
      color:           color.primary,
      border:          `1px solid ${color.primary}44`,
      fontFamily:      'var(--font-head)',
      fontWeight:      700,
      letterSpacing:   0.5,
      whiteSpace:      'nowrap',
      ...s,
    }}>
      {full ? name : abbr}
    </span>
  );
}
