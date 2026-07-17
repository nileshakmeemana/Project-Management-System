'use client';

interface Action {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

interface BulkBarProps {
  count: number;
  visible: boolean;
  actions: Action[];
  onClear?: () => void;
}

export default function BulkBar({ count, visible, actions, onClear }: BulkBarProps) {
  return (
    <div className={`pt-bulk-bar${visible && count > 0 ? ' visible' : ''}`}>
      <span className="pt-bulk-count">{count} selected</span>
      <div className="pt-bulk-actions">
        {actions.map(a => (
          <button
            key={a.label}
            className={`btn-secondary${a.danger ? ' pt-btn-critical' : ''}`}
            onClick={a.onClick}
          >
            <i className={`ti ${a.icon}`} /> {a.label}
          </button>
        ))}
        {onClear && (
          <button
            className="btn-secondary"
            onClick={onClear}
            title="Clear selection"
            style={{ color: 'var(--p-icon-secondary)' }}
          >
            <i className="ti ti-x" />
          </button>
        )}
      </div>
    </div>
  );
}
