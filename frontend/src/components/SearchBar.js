import React, { useState } from 'react';
import { useDebounce } from '../hooks/useUtils';

/**
 * SearchBar — controlled search input with debounce.
 * Props:
 *   placeholder  string
 *   onSearch(q)  called with debounced value
 *   delay        ms (default 300)
 */
export default function SearchBar({ placeholder = 'Search...', onSearch, delay = 300 }) {
  const [raw, setRaw] = useState('');
  const debounced = useDebounce(raw, delay);

  React.useEffect(() => {
    if (onSearch) onSearch(debounced);
  }, [debounced, onSearch]);

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, color: 'var(--txt3)', pointerEvents: 'none',
      }}>🔍</span>
      <input
        value={raw}
        onChange={e => setRaw(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 32 }}
      />
      {raw && (
        <button onClick={() => setRaw('')} style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt2)', fontSize: 14,
        }}>✕</button>
      )}
    </div>
  );
}
