'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Printer, Download, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { usePaymentsStore } from '@/store/paymentsStore';
import { usePayments } from '@/hooks/usePayments';
import { usePrint } from '@/hooks/usePrint';
import { formatCurrency, formatDate, statusColor, statusLabel, cn } from '@/lib/utils';

const COLS = [
  { key: 'voucher_no',  label: 'Voucher No',  sortable: true  },
  { key: 'date',        label: 'Date',         sortable: true  },
  { key: 'payee_name',  label: 'Payee',        sortable: true  },
  { key: 'amount',      label: 'Amount',       sortable: true  },
  { key: 'status',      label: 'Status',       sortable: false },
  { key: 'actions',     label: '',             sortable: false },
];

export default function PaymentTable() {
  const { vouchers, loading, selected, filters, setFilters, toggleSelected, setAllSelected, clearSelected } = usePaymentsStore();
  const { fetchVouchers, deleteVoucher } = usePayments();
  const { downloadPDF } = usePrint();
  const [sort,  setSort]  = useState('date');
  const [order, setOrder] = useState<'ASC'|'DESC'>('DESC');

  function toggleSort(key: string) {
    const newOrder = sort === key && order === 'DESC' ? 'ASC' : 'DESC';
    setSort(key);
    setOrder(newOrder);
    setFilters({ ...filters, sort: key, order: newOrder });
    fetchVouchers({ ...filters, sort: key, order: newOrder });
  }

  const allSelected = vouchers.length > 0 && vouchers.every(v => selected.includes(v.id));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 animate-pulse">
            <div className="w-4 h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded flex-1" />
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-4 bg-slate-200 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!vouchers.length) {
    return (
      <div className="bg-white rounded-2xl shadow-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Printer className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-semibold">No vouchers found</p>
        <p className="text-slate-400 text-sm mt-1">Import QuickBooks data to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected}
                  onChange={e => e.target.checked ? setAllSelected(vouchers.map(v => v.id)) : clearSelected()}
                  className="rounded border-slate-300" />
              </th>
              {COLS.map(col => (
                <th key={col.key}
                  className={cn('px-4 py-3 text-left text-xs font-semibold text-slate-500', col.sortable && 'cursor-pointer hover:text-slate-800')}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sort === col.key && (
                      order === 'DESC' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.map(v => (
              <tr key={v.id} className={cn('hover:bg-slate-50 transition', selected.includes(v.id) && 'bg-gold-50')}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggleSelected(v.id)}
                    className="rounded border-slate-300" />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{v.voucher_no}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(v.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{v.payee_name}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(v.amount, v.currency)}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', statusColor(v.status))}>
                    {statusLabel(v.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Link href={`/print/${v.id}`} title="Print" className="p-1.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link href={`/print/${v.id}`} title="Print Voucher" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                      <Printer className="w-4 h-4" />
                    </Link>
                    <button title="Download PDF"
                      onClick={() => downloadPDF(v.id, `${v.voucher_no}.pdf`)}
                      className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition">
                      <Download className="w-4 h-4" />
                    </button>
                    <button title="Cancel/Delete"
                      onClick={() => { if (confirm(`Cancel voucher ${v.voucher_no}?`)) deleteVoucher(v.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
