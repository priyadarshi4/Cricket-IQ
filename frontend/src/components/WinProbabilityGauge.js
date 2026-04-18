import React, { useEffect, useRef } from 'react';

/**
 * WinProbabilityGauge — animated SVG half-donut gauge.
 * Props:
 *   probability   — 0-100 (for the "home" / team1 side)
 *   label1        — label for the left team
 *   label2        — label for the right team
 *   color1        — hex color for team 1 arc
 *   color2        — hex color for team 2 arc
 *   size          — diameter in px (default 200)
 */
export default function WinProbabilityGauge({
  probability = 50,
  label1 = 'Team 1',
  label2 = 'Team 2',
  color1 = '#e63946',
  color2 = '#4361ee',
  size = 200,
}) {
  const arcRef = useRef(null);
  const p = Math.min(100, Math.max(0, probability));

  const r       = size * 0.38;
  const cx      = size / 2;
  const cy      = size / 2 + size * 0.06;
  const stroke  = size * 0.09;
  const circumf = Math.PI * r;          // half-circle circumference

  // Arc lengths
  const arc1 = (p / 100) * circumf;
  const arc2 = ((100 - p) / 100) * circumf;

  // We draw a half-circle starting from the left (180°) going clockwise to 0°.
  const startX = cx - r;
  const startY = cy;
  const endX   = cx + r;
  const endY   = cy;

  // The half-circle path (bottom half hidden by the card edge)
  const halfCircle = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} style={{ overflow: 'visible' }}>
      {/* Track */}
      <path
        d={halfCircle}
        fill="none"
        stroke="var(--bg4)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Team 2 arc (background, full) */}
      <path
        d={halfCircle}
        fill="none"
        stroke={color2}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumf} ${circumf}`}
        strokeDashoffset={0}
        opacity={0.7}
      />
      {/* Team 1 arc (foreground) */}
      <path
        ref={arcRef}
        d={halfCircle}
        fill="none"
        stroke={color1}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc1} ${circumf}`}
        strokeDashoffset={0}
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
      />
      {/* Centre text */}
      <text x={cx} y={cy - r * 0.18} textAnchor="middle"
        fill="var(--txt)" fontFamily="var(--font-head)" fontSize={size * 0.12} fontWeight={800}>
        {p}%
      </text>
      <text x={cx} y={cy + size * 0.05} textAnchor="middle"
        fill="var(--txt2)" fontFamily="var(--font-body)" fontSize={size * 0.06}>
        win probability
      </text>
      {/* Labels */}
      <text x={startX - 4} y={cy + size * 0.08} textAnchor="end"
        fill={color1} fontFamily="var(--font-head)" fontSize={size * 0.07} fontWeight={700}>
        {label1}
      </text>
      <text x={endX + 4} y={cy + size * 0.08} textAnchor="start"
        fill={color2} fontFamily="var(--font-head)" fontSize={size * 0.07} fontWeight={700}>
        {label2}
      </text>
    </svg>
  );
}
