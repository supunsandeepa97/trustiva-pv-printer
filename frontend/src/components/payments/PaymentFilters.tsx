'use client';
import { useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { usePaymentsStore } from '@/store/paymentsStore';
import { debounce } from '@/lib/utils';

// onFilter receives the freshly-computed filters so the parent doesn't fetch
// with a stale `filters` value (React state hasn't re-rendered yet when we call it).
export default function PaymentFilters({ onFilter }: { onFilter: (next?: Record<string, unknown>) => void }) {
  const { filters, setFilters } = usePaymentsStore();
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useCallback(
    debounce((val: string) => {
      const next = { ...filters, search: val || undefined, page: 1 };
      setFilters(next);
      onFilter(next);
    }, 350),
    [filters, setFilters, onFilter]
  );

  function updateFilter(key: string, value: string) {
    const next = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(next);
    onFilter(next);
  }

  function clearFilters() {
    setFilters({});
    if (searchRef.current) searchRef.current.value = '';
    onFilter({});
  }

  const hasFilters = filters.status || filters.date_from || filters.date_to || filters.search;

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={searchRef}
          defaultValue={filters.search || ''}
          onChange={e => debouncedSearch(e.target.value)}
          placeholder="Search payee, voucher no…"
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status || ''}
        onChange={e => updateFilter('status', e.target.value)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
      >
        <option value="">All Statuses</option>
        {['draft','pending','printed','cancelled'].map(s => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
        ))}
      </select>

      {/* Date range */}
      <input type="date" value={filters.date_from || ''} onChange={e => updateFilter('date_from', e.target.value)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />
      <span className="text-slate-400 text-sm">to</span>
      <input type="date" value={filters.date_to || ''} onChange={e => updateFilter('date_to', e.target.value)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />

      {hasFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-sm transition">
          <X className="w-4 h-4" /> Clear
        </button>
      )}
    </div>
  );
}
