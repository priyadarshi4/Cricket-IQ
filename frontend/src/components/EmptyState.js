import React from 'react';

export default function EmptyState({ icon = '🔍', title = 'No data', sub = '', action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--txt2)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, maxWidth: 300, margin: '0 auto 16px' }}>{sub}</div>}
      {action}
    </div>
  );
}
