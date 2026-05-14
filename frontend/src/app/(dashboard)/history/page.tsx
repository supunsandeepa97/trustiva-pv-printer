'use client';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useAuth } from '@/hooks/useAuth';
import PaymentTable   from '@/components/payments/PaymentTable';
import PaymentFilters from '@/components/payments/PaymentFilters';
import BulkActions    from '@/components/payments/BulkActions';
import PageHeader     from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils';

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchVouchers } = usePayments();
  const { total, page, limit, filters, setFilters, vouchers } = usePaymentsStore();

  useEffect(() => { if (user?.is_platform_admin) router.replace('/admin'); }, [user]);

  useEffect(() => {
    if (user?.is_platform_admin) return;
    fetchVouchers({ page: 1, limit: 20, sort: 'date', order: 'DESC' });
  }, []);

  const handleFilter = useCallback(() => {
    fetchVouchers({ ...filters, page: 1, limit: 20 });
  }, [filters, fetchVouchers]);

  function goToPage(p: number) {
    const updated = { ...filters, page: p, limit: 20 };
    setFilters(updated);
    fetchVouchers(updated);
  }

  const totalPages  = Math.ceil(total / (limit || 20));
  const totalAmount = vouchers.reduce((s, v) => s + Number(v.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader
        title="Payment History"
        subtitle={`${total.toLocaleString()} total vouchers`}
      />

      <BulkActions />
      <PaymentFilters onFilter={handleFilter} />
      <PaymentTable />

      {/* Footer: pagination + total */}
      {total > 0 && (
        <div className="bg-white rounded-2xl shadow-card px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {((page - 1) * (limit || 20)) + 1}–{Math.min(page * (limit || 20), total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{total}</span>
            {totalAmount > 0 && (
              <span className="ml-3 font-semibold" style={{ color: '#C9A227' }}>
                · {formatCurrency(totalAmount, 'LKR')} on this page
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7
                ? i + 1
                : page <= 4
                  ? i + 1
                  : page >= totalPages - 3
                    ? totalPages - 6 + i
                    : page - 3 + i;
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition"
                  style={p === page
                    ? { background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }
                    : { color: '#64748B' }}>
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
