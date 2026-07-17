'use client';

/** Skeleton placeholder shown while table data loads. */
export default function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="skel-table" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 'var(--p-space-400)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skel-line" style={{ flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton stat row (4 cards) for page headers. */
export function StatRowSkeleton() {
  return (
    <div className="stat-row">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="stat-card">
          <div className="skeleton-row" style={{ width: 80, marginBottom: 8 }} />
          <div className="skeleton-row" style={{ width: 50, height: 24 }} />
        </div>
      ))}
    </div>
  );
}
