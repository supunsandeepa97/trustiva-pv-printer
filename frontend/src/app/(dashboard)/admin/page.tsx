'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Building2, Users, FileText, ToggleLeft, ToggleRight, Loader2, TrendingUp } from 'lucide-react';
import { PlatformAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PlatformCompany } from '@/types';

export default function PlatformAdminPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const notify   = useUIStore(s => s.addNotification);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_platform_admin) { router.replace('/payments'); return; }
    PlatformAPI.listCompanies()
      .then(r => setCompanies(r.data.data))
      .catch(() => notify({ type: 'error', message: 'Failed to load companies' }))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string) {
    setToggling(id);
    try {
      const r = await PlatformAPI.toggleCompany(id);
      const updated = r.data.data as PlatformCompany;
      setCompanies(cs => cs.map(c => c.id === id ? { ...c, is_active: updated.is_active } : c));
      notify({ type: 'success', message: `Company ${updated.is_active ? 'activated' : 'deactivated'}` });
    } catch {
      notify({ type: 'error', message: 'Toggle failed' });
    } finally {
      setToggling(null);
    }
  }

  const activeCount   = companies.filter(c => c.is_active).length;
  const totalVouchers = companies.reduce((s, c) => s + c.voucher_count, 0);
  const totalUsers    = companies.reduce((s, c) => s + c.user_count, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C9A227' }} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
          <ShieldCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
            Platform Administration
          </h1>
          <p className="text-sm text-slate-500">Manage all companies on the Trustiva platform</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies',  value: companies.length,    icon: Building2,  color: '#C9A227' },
          { label: 'Active Companies', value: activeCount,         icon: ToggleRight, color: '#10B981' },
          { label: 'Total Users',      value: totalUsers,          icon: Users,       color: '#3B82F6' },
          { label: 'Total Vouchers',   value: totalVouchers,       icon: FileText,    color: '#8B5CF6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Companies table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All Companies</h2>
          <span className="text-xs text-slate-400">{companies.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Company', 'Contact', 'Users', 'Vouchers', 'Total Volume', 'Joined', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {companies.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 max-w-[160px] truncate">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {c.user_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> {c.voucher_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#C9A227' }}>
                    {formatCurrency(c.total_amount, 'LKR')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(c.id)}
                      disabled={toggling === c.id}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50"
                      style={c.is_active
                        ? { borderColor: '#FCA5A5', color: '#DC2626', background: '#FEF2F2' }
                        : { borderColor: '#6EE7B7', color: '#059669', background: '#ECFDF5' }}
                    >
                      {toggling === c.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : c.is_active
                          ? <ToggleLeft  className="w-3.5 h-3.5" />
                          : <ToggleRight className="w-3.5 h-3.5" />
                      }
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No companies registered yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
