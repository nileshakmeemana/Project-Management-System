'use client';

interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (p: number) => void;
}

export default function Pagination({ page, total, pageSize = 30, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page buttons — show at most 5 around current page
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="pg-wrap" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--p-space-100)',
      padding: 'var(--p-space-300) var(--p-space-400)',
      borderTop: '.0625rem solid var(--p-border-subdued)',
    }}>
      {/* Prev */}
      <button
        className="pg-btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} style={{ fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)', padding: '0 2px' }}>…</span>
          : <button
              key={p}
              className={`pg-btn${p === page ? ' active' : ''}`}
              onClick={() => onChange(p as number)}
              aria-current={p === page ? 'page' : undefined}
            >{p}</button>
      )}

      {/* Next */}
      <button
        className="pg-btn"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
      </button>

      {/* "1–30 of 50" count */}
      <span style={{
        fontSize: 'var(--p-font-size-275)',
        color: 'var(--p-text-secondary)',
        marginLeft: 'var(--p-space-200)',
        whiteSpace: 'nowrap',
      }}>
        {from}–{to} of {total}
      </span>
    </div>
  );
}
