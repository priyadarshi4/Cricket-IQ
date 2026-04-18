import React from 'react';

/**
 * StatCard — single metric display.
 * Props: label, value, sub, color, icon, trend ('+5%' | '-2%')
 */
export default function StatCard({ label, value, sub, color = 'var(--txt)', icon, trend }) {
  const trendUp = trend && trend.startsWith('+');
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color === 'var(--txt)' ? 'var(--border)' : color + '88' }} />
      {icon && <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{sub}</div>}
      {trend && (
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700,
          color: trendUp ? 'var(--green)' : 'var(--red)',
          background: (trendUp ? 'var(--green)' : 'var(--red)') + '18',
          padding: '2px 6px', borderRadius: 4,
        }}>
          {trend}
        </div>
      )}
    </div>
  );
}
