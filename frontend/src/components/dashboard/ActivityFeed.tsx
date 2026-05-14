import { Upload, Printer } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { ImportRecord } from '@/types';

interface RecentPrint {
  printed_at:   string;
  printed_by:   string;
  voucher_no:   string;
  payee_name:   string;
  amount:       number;
}

interface ActivityFeedProps {
  recentImports: ImportRecord[];
  recentPrints:  RecentPrint[];
}

export default function ActivityFeed({ recentImports, recentPrints }: ActivityFeedProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-5 shadow-card">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Recent Imports</h3>
        {recentImports.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No imports yet</p>
        ) : (
          <div className="space-y-3">
            {recentImports.map(imp => (
              <div key={imp.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-gold-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{imp.filename}</p>
                  <p className="text-xs text-slate-500">{imp.imported_rows} vouchers · {formatDateTime(imp.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Recent Prints</h3>
        {recentPrints.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No prints yet</p>
        ) : (
          <div className="space-y-3">
            {recentPrints.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Printer className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.payee_name} · {p.voucher_no}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(p.amount)} · {formatDateTime(p.printed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
