import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shows a range summary + prev/next. Renders nothing when there's a single page.
export default function Pagination({ page, pages, total, limit = 20, onPage }) {
  if (!pages || pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-surface-100">
      <p className="text-xs text-ink-tertiary">{from}–{to} / {total}</p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg border border-surface-200 text-ink-secondary hover:bg-surface-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-ink-secondary px-2 tabular-nums">{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg border border-surface-200 text-ink-secondary hover:bg-surface-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
