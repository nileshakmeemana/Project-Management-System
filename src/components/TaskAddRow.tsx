'use client';
import { useState, useCallback } from 'react';

type Priority = 'high' | 'med' | 'low';
interface Props { onAdd: (text: string, priority: Priority) => void; }

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '12px',
  alignItems: 'center',
};
const inputStyle: React.CSSProperties = {
  flex: '1 1 0%',
  minWidth: '0px',
  height: '32px',
  padding: '0 12px',
  background: 'var(--p-surface-secondary)',
  border: '1px solid var(--p-border)',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: 'var(--p-text)',
  outline: 'none',
  boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = {
  width: '96px',
  flexShrink: 0,
  height: '32px',
  padding: '0 8px',
  background: 'var(--p-surface-secondary)',
  border: '1px solid var(--p-border)',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: 'var(--p-text)',
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  flexShrink: 0,
  height: '32px',
  padding: '0 16px',
  background: '#1a1a1a',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap' as const,
};

export default function TaskAddRow({ onAdd }: Props) {
  const [text, setText] = useState('');
  const [prio, setPrio] = useState<Priority>('med');

  const submit = useCallback(() => {
    if (!text.trim()) return;
    onAdd(text.trim(), prio);
    setText('');
  }, [text, prio, onAdd]);

  return (
    <div style={rowStyle}>
      <input
        type="text"
        placeholder="Add a task…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        style={inputStyle}
      />
      <select value={prio} onChange={e => setPrio(e.target.value as Priority)} style={selectStyle}>
        <option value="high">High</option>
        <option value="med">Medium</option>
        <option value="low">Low</option>
      </select>
      <button onClick={submit} style={btnStyle}>
        <i className="ti ti-plus" /> Add
      </button>
    </div>
  );
}
