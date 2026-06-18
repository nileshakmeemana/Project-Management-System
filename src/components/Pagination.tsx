'use client';

interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, pageSize = 50, onChange }: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const getPages = () => {
    const result: (number | '...')[] = [];
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    result.push(1);
    if (page > 3) result.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) result.push(i);
    if (page < pages - 2) result.push('...');
    result.push(pages);
    return result;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--p-space-100)', padding: 'var(--p-space-300) var(--p-space-400)',
      borderTop: '.0625rem solid var(--p-border-subdued)',
    }}>
      <button className="pg-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
      </button>
      {getPages().map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="pg-ellipsis">…</span>
          : <button key={p} className={`pg-btn${page === p ? ' active' : ''}`} onClick={() => onChange(p as number)}>{p}</button>
      )}
      <button className="pg-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>
        <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
      </button>
      <span style={{ fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)', marginLeft: 'var(--p-space-200)' }}>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
    </div>
  );
}
