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
  // Use the exact HTML source class names from pt-bulk-bar
  // CSS handles show/hide via .pt-bulk-bar vs .pt-bulk-bar.visible
  // No inline styles so the bar looks correct on first render without a flash

  return (
    <div className={`pt-bulk-bar${visible && count > 0 ? ' visible' : ''}`}>
      {/* Count */}
      <span className="pt-bulk-count">{count} selected</span>

      {/* Action buttons */}
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
      </div>

      {/* Clear */}
      {onClear && (
        <button
          className="btn-secondary"
          onClick={onClear}
          title="Clear selection"
          style={{ marginLeft: 'auto' }}
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  );
}
