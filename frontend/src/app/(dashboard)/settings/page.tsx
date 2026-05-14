'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, Loader2, Users, Building, Palette, Printer, Landmark, Plus, Trash2, X, UserCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { CompanyAPI, SettingsAPI, AuthAPI } from '@/lib/api';

interface PendingUser { id: string; name: string; email: string; role: string; company_name: string; created_at: string; approval_status: string; }
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import type { Company } from '@/types';

type Tab = 'company' | 'branding' | 'printing' | 'banks' | 'users' | 'pending';

interface BankAccount {
  id:        string;
  name:      string;
  branch?:   string;
  account_no?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const notify = useUIStore(s => s.addNotification);
  const { user, isAllowed } = useAuth();
  const canEditCompany = isAllowed(['super_admin', 'finance_manager']);
  useEffect(() => { if (user?.is_platform_admin) router.replace('/admin'); }, [user]);
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [company,   setCompany]   = useState<Company | null>(null);
  const [settings,  setSettings]  = useState<Record<string, string>>({});
  const [users,        setUsers]        = useState<Array<{ id: string; name: string; email: string; role: string; is_active: boolean; approval_status: string; created_at: string }>>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const logoRef = useRef<HTMLInputElement>(null);
  const wmRef   = useRef<HTMLInputElement>(null);

  // Bank accounts state
  const [banks,       setBanks]       = useState<BankAccount[]>([]);
  const [bankForm,    setBankForm]    = useState({ name: '', branch: '', account_no: '' });
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankSaving,   setBankSaving]  = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, sRes] = await Promise.all([CompanyAPI.get(), SettingsAPI.get()]);
        setCompany(cRes.data.data);
        const s = sRes.data.data;
        setSettings(s);
        try { setBanks(JSON.parse(s.bank_accounts || '[]')); } catch { setBanks([]); }
        if (isAllowed(['super_admin'])) {
          const [uRes, pRes] = await Promise.all([CompanyAPI.getUsers(), AuthAPI.getPendingRequests()]);
          setUsers(uRes.data.data);
          const pending: PendingUser[] = pRes.data.data;
          setPendingUsers(pending);
          setPendingCount(pending.length);
        }
      } catch { notify({ type: 'error', message: 'Failed to load settings' }); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function saveCompany() {
    if (!company) return;
    setSaving(true);
    try {
      await CompanyAPI.update({ name: company.name, address: company.address, phone: company.phone, email: company.email, tax_number: company.tax_number });
      notify({ type: 'success', message: 'Company details saved' });
    } catch { notify({ type: 'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  }

  async function savePrintingSettings() {
    setSaving(true);
    try {
      await SettingsAPI.update(settings);
      notify({ type: 'success', message: 'Printing settings saved' });
    } catch { notify({ type: 'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  }

  async function uploadLogo() {
    const file = logoRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('logo', file);
    try {
      const res = await CompanyAPI.uploadLogo(form);
      setCompany(c => c ? { ...c, logo_url: res.data.data.logo_url } : c);
      notify({ type: 'success', message: 'Logo uploaded' });
    } catch { notify({ type: 'error', message: 'Upload failed' }); }
  }

  async function uploadWatermark() {
    const file = wmRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('watermark', file);
    try {
      await CompanyAPI.uploadWatermark(form);
      notify({ type: 'success', message: 'Watermark uploaded' });
    } catch { notify({ type: 'error', message: 'Upload failed' }); }
  }

  async function saveBanks(updated: BankAccount[]) {
    await SettingsAPI.update({ bank_accounts: JSON.stringify(updated) });
    setBanks(updated);
  }

  async function addBank() {
    if (!bankForm.name.trim()) return;
    setBankSaving(true);
    try {
      const entry: BankAccount = {
        id:         Date.now().toString(),
        name:       bankForm.name.trim(),
        branch:     bankForm.branch.trim() || undefined,
        account_no: bankForm.account_no.trim() || undefined,
      };
      await saveBanks([...banks, entry]);
      setBankForm({ name: '', branch: '', account_no: '' });
      setShowBankForm(false);
      notify({ type: 'success', message: 'Bank account added' });
    } catch { notify({ type: 'error', message: 'Save failed' }); }
    finally { setBankSaving(false); }
  }

  async function deleteBank(id: string) {
    try {
      await saveBanks(banks.filter(b => b.id !== id));
      notify({ type: 'success', message: 'Bank removed' });
    } catch { notify({ type: 'error', message: 'Delete failed' }); }
  }

  const TABS: { id: Tab; label: string; icon: typeof Building; adminOnly?: boolean }[] = [
    { id: 'company',  label: 'Company Info',    icon: Building   },
    { id: 'branding', label: 'Branding',        icon: Palette    },
    { id: 'printing', label: 'Printing',        icon: Printer    },
    { id: 'banks',    label: 'Bank Accounts',   icon: Landmark   },
    { id: 'users',    label: 'Users',           icon: Users,      adminOnly: true },
    { id: 'pending',  label: 'Pending Requests',icon: UserCheck,  adminOnly: true },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C9A227' }} /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage company details and system preferences" />

      <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-xl p-1 shadow-card border border-slate-200 w-fit">
        {TABS.filter(t => !t.adminOnly || isAllowed(['super_admin'])).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === id ? 'text-navy-900' : 'text-slate-600 hover:bg-slate-100'}`}
            style={activeTab === id ? { background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A', boxShadow: '0 2px 10px rgba(201,162,39,0.35)' } : {}}>
            <Icon className="w-4 h-4" /> {label}
            {id === 'pending' && pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        {/* Company Info */}
        {activeTab === 'company' && company && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Company Information</h3>
            {[
              { label: 'Company Name',  key: 'name',       type: 'text' },
              { label: 'Address',       key: 'address',    type: 'text' },
              { label: 'Phone',         key: 'phone',      type: 'tel'  },
              { label: 'Email',         key: 'email',      type: 'email'},
              { label: 'Tax/VAT Number',key: 'tax_number', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <input type={type} value={(company as unknown as Record<string, string>)[key] || ''}
                  onChange={e => setCompany(c => c ? { ...c, [key]: e.target.value } : c)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            ))}
            {canEditCompany ? (
              <button onClick={saveCompany} disabled={saving}
                className="flex items-center gap-2 disabled:opacity-60 font-semibold px-5 py-2.5 rounded-xl transition text-sm"
                style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
            ) : (
              <p className="text-xs text-slate-400">You need Finance Manager or higher role to edit company details.</p>
            )}
          </div>
        )}

        {/* Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900">Branding Assets</h3>
            {[
              { label: 'Company Logo', hint: 'PNG recommended · Appears on voucher header', ref: logoRef, fn: uploadLogo, preview: company?.logo_url, key: 'logo' },
              { label: 'Watermark',    hint: 'PNG with transparency · Optional background watermark', ref: wmRef, fn: uploadWatermark, preview: company?.watermark_url, key: 'watermark' },
            ].map(({ label, hint, ref, fn, preview }) => (
              <div key={label} className="flex items-start gap-6">
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 flex-shrink-0">
                  {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-contain rounded-xl p-1" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-0.5">{label}</p>
                  <p className="text-slate-500 text-sm mb-3">{hint}</p>
                  <input ref={ref} type="file" accept="image/*" className="hidden" onChange={fn} />
                  {canEditCompany && (
                    <button onClick={() => ref.current?.click()}
                      className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm px-4 py-2 rounded-xl transition">
                      <Upload className="w-4 h-4" /> Upload {label}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Printing defaults */}
        {activeTab === 'printing' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Printing Defaults</h3>
            {[
              { label: 'Voucher Number Prefix', key: 'voucher_prefix',  type: 'text', placeholder: 'PV' },
              { label: 'Starting Number',       key: 'voucher_start',   type: 'number', placeholder: '1001' },
              { label: 'Default Copies',        key: 'default_copies',  type: 'number', placeholder: '1' },
              { label: 'Default Currency',      key: 'default_currency',type: 'text', placeholder: 'LKR' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <input type={type} value={settings[key] || ''} placeholder={placeholder}
                  onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            ))}
            {canEditCompany ? (
              <button onClick={savePrintingSettings} disabled={saving}
                className="flex items-center gap-2 disabled:opacity-60 font-semibold px-5 py-2.5 rounded-xl transition text-sm"
                style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
              </button>
            ) : (
              <p className="text-xs text-slate-400">You need Finance Manager or higher role to edit these settings.</p>
            )}
          </div>
        )}

        {/* Bank Accounts */}
        {activeTab === 'banks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Bank Accounts</h3>
              {canEditCompany && (
                <button
                  onClick={() => setShowBankForm(v => !v)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition"
                  style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}
                >
                  {showBankForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showBankForm ? 'Cancel' : 'Add Bank'}
                </button>
              )}
            </div>

            {/* Add form */}
            {showBankForm && (
              <div className="border border-gold-300 rounded-xl p-4 space-y-3 bg-amber-50/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bank Name *</label>
                    <input
                      type="text" placeholder="e.g. Sampath Bank"
                      value={bankForm.name}
                      onChange={e => setBankForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Branch</label>
                    <input
                      type="text" placeholder="e.g. Colombo 03"
                      value={bankForm.branch}
                      onChange={e => setBankForm(f => ({ ...f, branch: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Account No</label>
                    <input
                      type="text" placeholder="e.g. 0012345678"
                      value={bankForm.account_no}
                      onChange={e => setBankForm(f => ({ ...f, account_no: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addBank} disabled={bankSaving || !bankForm.name.trim()}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}
                >
                  {bankSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Bank
                </button>
              </div>
            )}

            {/* Bank list */}
            {banks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                No bank accounts added yet. Click "Add Bank" to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {banks.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{b.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[b.branch, b.account_no].filter(Boolean).join(' · ') || 'No details'}
                      </p>
                    </div>
                    {canEditCompany && (
                      <button
                        onClick={() => deleteBank(b.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        aria-label={`Remove ${b.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Pending Access Requests</h3>
            {!isAllowed(['super_admin']) ? (
              <p className="text-slate-500 text-sm">Only Super Admins can manage access requests.</p>
            ) : pendingUsers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                  <p className="text-slate-500 text-sm font-medium">No pending requests</p>
                  <p className="text-slate-400 text-xs mt-1">All access requests have been reviewed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Company','Name','Email','Role','Requested','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingUsers.map(u => (
                        <tr key={u.id} className="hover:bg-amber-50/40">
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{u.company_name}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              {u.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{u.email}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{u.role.replace(/_/g,' ')}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await AuthAPI.approveUser(u.id);
                                    setPendingUsers(ps => ps.filter(x => x.id !== u.id));
                                    setPendingCount(c => Math.max(0, c - 1));
                                    notify({ type: 'success', message: `${u.name} approved` });
                                  } catch { notify({ type: 'error', message: 'Approval failed' }); }
                                }}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await AuthAPI.rejectUser(u.id);
                                    setPendingUsers(ps => ps.filter(x => x.id !== u.id));
                                    setPendingCount(c => Math.max(0, c - 1));
                                    notify({ type: 'success', message: `${u.name} rejected` });
                                  } catch { notify({ type: 'error', message: 'Rejection failed' }); }
                                }}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">User Management</h3>
            {!isAllowed(['super_admin']) ? (
              <p className="text-slate-500 text-sm">Only Super Admins can manage users.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Name','Email','Role','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{u.role.replace('_',' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={async () => {
                              try {
                                await CompanyAPI.updateUser(u.id, { is_active: !u.is_active });
                                setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
                                notify({ type: 'success', message: `User ${u.is_active ? 'deactivated' : 'activated'}` });
                              } catch { notify({ type: 'error', message: 'Action failed' }); }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded-lg transition"
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
