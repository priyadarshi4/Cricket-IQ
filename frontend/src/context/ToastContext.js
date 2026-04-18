import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

let toastId = 0;

/**
 * ToastProvider — wrap App in this.
 * Then call useToast() anywhere to show notifications.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error',   dur),
    info:    (msg, dur) => show(msg, 'info',     dur),
    warn:    (msg, dur) => show(msg, 'warn',     dur),
  };

  const colors = { success: '#00c49a', error: '#e63946', info: '#4361ee', warn: '#f77f00' };
  const icons  = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 320, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => dismiss(t.id)} style={{
            background:    'var(--bg2)',
            border:        `1px solid ${colors[t.type]}44`,
            borderLeft:    `3px solid ${colors[t.type]}`,
            borderRadius:  10,
            padding:       '12px 16px',
            fontSize:      13,
            color:         'var(--txt)',
            pointerEvents: 'all',
            cursor:        'pointer',
            display:       'flex',
            alignItems:    'center',
            gap:           10,
            boxShadow:     '0 4px 20px rgba(0,0,0,0.4)',
            animation:     'slideInRight 0.3s ease',
          }}>
            <span style={{ color: colors[t.type], fontSize: 15, flexShrink: 0 }}>{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('Must be inside ToastProvider');
  return ctx;
}
