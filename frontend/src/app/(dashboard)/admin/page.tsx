'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Building2, Users, FileText,
  ToggleLeft, ToggleRight, Loader2, TrendingUp,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  UserCheck, AlertCircle,
} from 'lucide-react';
import { PlatformAPI, AuthAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PlatformCompany } from '@/types';

type Tab = 'pending' | 'companies';

interface PendingUser {
  id: string; name: string; email: string; role: string;
  company_name: string; created_at: string; approval_status: string;
}

interface CompanyUser {
  id: string; name: string; email: string; role: string;
  is_active: boolean; approval_status: string; created_at: string;
}

export default function PlatformAdminPage() {
  const { user }  = useAuth();
  const router    = useRouter();
  const notify    = useUIStore(s => s.addNotification);

  const [tab,          setTab]          = useState<Tab>('pending');
  const [companies,    setCompanies]    = useState<PlatformCompany[]>([]);
  const [pending,      setPending]      = useState<PendingUser[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState<string | null>(null);
  const [acting,       setActing]       = useState<string | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<Record<string, CompanyUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_platform_admin) { router.replace('/payments'); return; }
    Promise.all([
      PlatformAPI.listCompanies(),
      AuthAPI.getPendingRequests(),
    ])
      .then(([cRes, pRes]) => {
        setCompanies(cRes.data.data);
        setPending(pRes.data.data);
      })
      .catch(() => notify({ type: 'error', message: 'Failed to load admin data' }))
      .finally(() => setLoading(false));
  }, []);

  async function approve(u: PendingUser) {
    setActing(u.id);
    try {
      await AuthAPI.approveUser(u.id);
      setPending(ps => ps.filter(x => x.id !== u.id));
      setCompanies(cs => cs.map(c =>
        c.name === u.company_name ? { ...c, user_count: c.user_count + 1 } : c
      ));
      notify({ type: 'success', message: `${u.name} approved — ${u.company_name} is now active` });
    } catch { notify({ type: 'error', message: 'Approval failed' }); }
    finally { setActing(null); }
  }

  async function reject(u: PendingUser) {
    setActing(u.id);
    try {
      await AuthAPI.rejectUser(u.id);
      setPending(ps => ps.filter(x => x.id !== u.id));
      notify({ type: 'info', message: `${u.name} rejected` });
    } catch { notify({ type: 'error', message: 'Rejection failed' }); }
    finally { setActing(null); }
  }

  async function toggle(id: string) {
    setToggling(id);
    try {
      const r = await PlatformAPI.toggleCompany(id);
      const updated = r.data.data as PlatformCompany;
      setCompanies(cs => cs.map(c => c.id === id ? { ...c, is_active: updated.is_active } : c));
      notify({ type: 'success', message: `Company ${updated.is_active ? 'activated' : 'deactivated'}` });
    } catch { notify({ type: 'error', message: 'Toggle failed' }); }
    finally { setToggling(null); }
  }

  async function expandCompany(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (companyUsers[id]) return;
    setLoadingUsers(id);
    try {
      const r = await PlatformAPI.getCompanyUsers(id);
      setCompanyUsers(prev => ({ ...prev, [id]: r.data.data }));
    } catch { notify({ type: 'error', message: 'Failed to load users' }); }
    finally { setLoadingUsers(null); }
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies',   value: companies.length, icon: Building2,   color: '#C9A227' },
          { label: 'Active Companies',  value: activeCount,      icon: ToggleRight,  color: '#10B981' },
          { label: 'Total Users',       value: totalUsers,       icon: Users,        color: '#3B82F6' },
          { label: 'Pending Approvals', value: pending.length,   icon: UserCheck,    color: pending.length > 0 ? '#F59E0B' : '#94A3B8' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3">
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

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-card border border-slate-200 w-fit">
        {([
          { id: 'pending',   label: 'Pending Approvals', icon: UserCheck,  badge: pending.length },
          { id: 'companies', label: 'All Companies',      icon: Building2,  badge: 0 },
        ] as const).map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition"
            style={tab === id
              ? { background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A', boxShadow: '0 2px 10px rgba(201,162,39,0.35)' }
              : { color: '#64748B' }}>
            <Icon className="w-4 h-4" />
            {label}
            {badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center bg-amber-500 text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Pending Approvals ── */}
        {tab === 'pending' && (
          <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Pending Company Registrations</h2>
              <span className="text-xs text-slate-400">{pending.length} awaiting review</span>
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-300" />
                <p className="font-medium text-slate-500">All caught up</p>
                <p className="text-sm mt-1">No pending registrations</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {pending.map(u => (
                  <motion.div key={u.id} layout
                    className="flex items-center gap-4 px-6 py-4 hover:bg-amber-50/30 transition">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Company Admin
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{u.email}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-600 font-medium">{u.company_name}</p>
                        <span className="text-slate-300">·</span>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-400">{formatDate(u.created_at)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => approve(u)}
                        disabled={acting === u.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      >
                        {acting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => reject(u)}
                        disabled={acting === u.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        {acting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── All Companies ── */}
        {tab === 'companies' && (
          <motion.div key="companies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">All Companies</h2>
              <span className="text-xs text-slate-400">{companies.length} total</span>
            </div>

            <div className="divide-y divide-slate-50">
              {companies.map((c, i) => (
                <div key={c.id}>
                  {/* Company row */}
                  <motion.div
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => expandCompany(c.id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + contact */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email || 'No email'}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-sm text-slate-600">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" />{c.user_count} users</span>
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" />{c.voucher_count} vouchers</span>
                      <span className="font-semibold" style={{ color: '#C9A227' }}>{formatCurrency(c.total_amount, 'LKR')}</span>
                      <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); toggle(c.id); }}
                      disabled={toggling === c.id}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 flex-shrink-0"
                      style={c.is_active
                        ? { borderColor: '#FCA5A5', color: '#DC2626', background: '#FEF2F2' }
                        : { borderColor: '#6EE7B7', color: '#059669', background: '#ECFDF5' }}
                    >
                      {toggling === c.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : c.is_active ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* Expand chevron */}
                    {expandedId === c.id
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </motion.div>

                  {/* Expanded users panel */}
                  <AnimatePresence>
                    {expandedId === c.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-50 border-t border-slate-100"
                      >
                        <div className="px-6 py-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Users in {c.name}</p>
                          {loadingUsers === c.id ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
                            </div>
                          ) : (companyUsers[c.id] || []).length === 0 ? (
                            <p className="text-sm text-slate-400">No users found</p>
                          ) : (
                            <div className="space-y-2">
                              {(companyUsers[c.id] || []).map(u => (
                                <div key={u.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-100">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{u.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                  </div>
                                  <span className="text-xs text-slate-500 capitalize hidden sm:block">{u.role.replace(/_/g,' ')}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    u.approval_status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                                    u.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-red-100 text-red-600'
                                  }`}>
                                    {u.approval_status}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    u.is_active ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-400'
                                  }`}>
                                    {u.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {companies.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-sm">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No companies registered yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
