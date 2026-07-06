'use client';
import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { TemplateAPI, CompanyAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateEditor from '@/components/templates/TemplateEditor';
import PageHeader from '@/components/layout/PageHeader';
import type { VoucherTemplate, Company } from '@/types';

export default function TemplatesPage() {
  const notify = useUIStore(s => s.addNotification);
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [company,   setCompany]   = useState<Company | null>(null);
  const [selected,  setSelected]  = useState<VoucherTemplate | null>(null);
  const [loading,   setLoading]   = useState(true);

  async function load() {
    try {
      const [tRes, cRes] = await Promise.all([TemplateAPI.list(), CompanyAPI.get()]);
      setTemplates(tRes.data.data);
      setCompany(cRes.data.data);
      if (!selected && tRes.data.data.length > 0) setSelected(tRes.data.data[0]);
    } catch { notify({ type: 'error', message: 'Failed to load templates' }); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createNew() {
    try {
      const res = await TemplateAPI.create({
        name: `New Template ${templates.length + 1}`,
        config: {
          visible_fields: ['logo','voucher_no','date','payee_name','amount','amount_words','description','bank_name','cheque_no','account_name','currency','signature'],
          styles: { headerBg: '#0F172A', titleColor: '#FFFFFF', accentColor: '#2563EB' },
          signature_labels: { left: 'Prepared By', center: 'Approved By', right: 'Received By' },
        },
        paper_size: 'A5_portrait',
      });
      setSelected(res.data.data);
      await load();
    } catch { notify({ type: 'error', message: 'Failed to create template' }); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
    </div>
  );

  return (
    <div className="max-w-full">
      <PageHeader
        title="Voucher Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={createNew}
            className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Plus className="w-4 h-4" /> New Template
          </button>
        }
      />

      <div className="flex gap-6">
        {/* Template list */}
        <div className="w-64 flex-shrink-0 space-y-3">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              isSelected={selected?.id === t.id}
              onSelect={t => { setSelected(t); }}
              onRefresh={() => { load(); }}
            />
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {selected && company ? (
            <TemplateEditor
              key={selected.id}
              template={selected}
              company={company}
              onSaved={() => { load(); }}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-card flex items-center justify-center h-64 text-slate-400">
              Select a template to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
