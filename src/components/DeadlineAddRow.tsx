'use client';
import { useState, useCallback } from 'react';

interface Props { onAdd: (text: string, date: string) => void; }

// All styles defined as constants — applied synchronously on mount
const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  alignItems: 'center',
};
const textStyle: React.CSSProperties = {
  flex: '1 1 0%',
  minWidth: '0px',
  height: '28px',
  padding: '0 10px',
  background: 'var(--p-surface-secondary)',
  border: '1px solid var(--p-border)',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: 'var(--p-text)',
  outline: 'none',
  boxSizing: 'border-box',
};
const dateStyle: React.CSSProperties = {
  width: '130px',
  flexShrink: 0,
  height: '28px',
  padding: '0 6px',
  background: 'var(--p-surface-secondary)',
  border: '1px solid var(--p-border)',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: 'var(--p-text)',
  outline: 'none',
  boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  flexShrink: 0,
  height: '28px',
  padding: '0 10px',
  background: 'var(--p-surface)',
  border: '1px solid var(--p-border)',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  color: 'var(--p-text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--p-shadow-button)',
};

export default function DeadlineAddRow({ onAdd }: Props) {
  const [text, setText] = useState('');
  const [date, setDate] = useState('');

  const submit = useCallback(() => {
    if (!text.trim() || !date) return;
    onAdd(text.trim(), date);
    setText('');
    setDate('');
  }, [text, date, onAdd]);

  return (
    <div style={rowStyle}>
      <input
        type="text"
        placeholder="Add deadline…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        style={textStyle}
      />
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={dateStyle}
      />
      <button onClick={submit} style={btnStyle}>
        <i className="ti ti-plus" />
      </button>
    </div>
  );
}
