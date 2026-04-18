import React from 'react';

export default function LoadingSpinner({ text = 'Loading...', size = 24 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
      <div style={{
        width: size, height: size,
        border: `2px solid var(--border2)`,
        borderTopColor: 'var(--orange)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <div style={{ fontSize: 13, color: 'var(--txt2)' }}>{text}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid var(--border2)', borderTopColor: 'var(--orange)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle', marginRight: 6,
    }} />
  );
}
