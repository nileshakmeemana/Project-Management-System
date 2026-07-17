'use client';
import { useState, useRef, useEffect } from 'react';

const PRESETS = [
  ['today',     'Today'],
  ['yesterday', 'Yesterday'],
  ['last7',     'Last 7 days'],
  ['last30',    'Last 30 days'],
  ['last90',    'Last 90 days'],
  ['mtd',       'Month to date'],
  ['ytd',       'Year to date'],
  ['all',       'All time'],
] as const;

export type PeriodPreset = typeof PRESETS[number][0];

export interface DateRange {
  preset: PeriodPreset | 'custom';
  label: string;
  start?: Date;
  end?: Date;
}

export function buildRange(preset: PeriodPreset | 'custom', customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = PRESETS.find(([p]) => p === preset)?.[1] ?? 'Custom';

  switch (preset) {
    case 'today':     return { preset, label, start: today, end: new Date(today.getTime() + 86399999) };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return { preset, label, start: y, end: new Date(y.getTime()+86399999) }; }
    case 'last7':     { const s = new Date(today); s.setDate(s.getDate()-6); return { preset, label, start: s, end: new Date() }; }
    case 'last30':    { const s = new Date(today); s.setDate(s.getDate()-29); return { preset, label, start: s, end: new Date() }; }
    case 'last90':    { const s = new Date(today); s.setDate(s.getDate()-89); return { preset, label, start: s, end: new Date() }; }
    case 'mtd':       return { preset, label, start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() };
    case 'ytd':       return { preset, label, start: new Date(now.getFullYear(), 0, 1), end: new Date() };
    case 'all':       return { preset, label };
    case 'custom':
      return { preset, label: 'Custom', start: customStart ? new Date(customStart) : undefined, end: customEnd ? new Date(new Date(customEnd).getTime() + 86399999) : undefined };
    default:          return { preset: 'all', label: 'All time' };
  }
}

interface Props {
  id?: string;
  onChange?: (range: DateRange) => void;
}

export default function PeriodFilter({ id = 'default', onChange }: Props) {
  const [open, setOpen]       = useState(false);
  const [range, setRange]     = useState<DateRange>({ preset: 'all', label: 'All time' });
  const [customS, setCustomS] = useState('');
  const [customE, setCustomE] = useState('');
  const btnRef  = useRef<HTMLButtonElement>(null);
  const popRef  = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPopPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(o => !o);
  };

  const select = (preset: PeriodPreset) => {
    const r = buildRange(preset);
    setRange(r);
    setOpen(false);
    onChange?.(r);
  };

  const applyCustom = () => {
    const r = buildRange('custom', customS, customE);
    setRange(r);
    setOpen(false);
    onChange?.(r);
  };

  return (
    <div className="period-wrap" style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        className="btn-secondary"
        style={{ height: '2rem', fontSize: 'var(--p-font-size-325)' }}
        onClick={toggle}
      >
        <i className="ti ti-calendar" />
        <span>{range.label}</span>
        <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
      </button>

      {open && (
        <div
          ref={popRef}
          className="period-pop"
          style={{
            display: 'block',
            position: 'fixed',
            top: popPos.top,
            right: popPos.right,
            zIndex: 660,
          }}
        >
          {PRESETS.map(([p, label]) => (
            <button
              key={p}
              className={`period-opt${range.preset === p ? ' selected' : ''}`}
              onClick={() => select(p)}
            >
              <span>{label}</span>
              {range.preset === p && <i className="ti ti-check" />}
            </button>
          ))}
          <div className="period-divider" />
          <div className="period-custom">
            <div className="period-custom-label">Custom range</div>
            <div className="period-custom-row">
              <input type="date" value={customS} onChange={e => setCustomS(e.target.value)} aria-label="Starting" />
              <i className="ti ti-arrow-right" style={{ color: 'var(--p-icon-secondary)', fontSize: 12, flexShrink: 0 }} />
              <input type="date" value={customE} onChange={e => setCustomE(e.target.value)} aria-label="Ending" />
            </div>
            <button
              className="btn-primary"
              style={{ height: '1.75rem', fontSize: 'var(--p-font-size-300)', width: '100%', justifyContent: 'center' }}
              onClick={applyCustom}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
