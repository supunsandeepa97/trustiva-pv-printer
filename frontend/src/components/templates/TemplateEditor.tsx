'use client';
import { useState, useRef } from 'react';
import { Save, Loader2, Upload } from 'lucide-react';
import { TemplateAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import VoucherA5 from '@/components/voucher/VoucherA5';
import { VOUCHER_FIELDS } from '@/lib/templateVariables';
import type { VoucherTemplate, PaymentVoucher, Company, TemplateConfig } from '@/types';

const SAMPLE_VOUCHER: PaymentVoucher = {
  id: 'preview', company_id: 'c1', voucher_no: 'PV-0001', date: '2024-01-15',
  payee_name: 'ABC Supplies (Pvt) Ltd', amount: 125450.75, currency: 'LKR',
  amount_words: 'Rupees One Hundred Twenty Five Thousand Four Hundred Fifty and Seventy Five Cents Only',
  description: 'Purchase of office stationery and supplies for Q1 2024',
  bank_name: 'Commercial Bank', cheque_no: '001234', account_name: '6000 - Supplies Expense',
  prepared_by: 'John Silva', status: 'pending', created_at: new Date().toISOString(),
};

interface TemplateEditorProps {
  template:  VoucherTemplate;
  company:   Company;
  onSaved:   () => void;
}

export default function TemplateEditor({ template, company, onSaved }: TemplateEditorProps) {
  const notify = useUIStore(s => s.addNotification);
  const [name,    setName]    = useState(template.name);
  const [config,  setConfig]  = useState<TemplateConfig>(template.config);
  const [saving,  setSaving]  = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  function toggleField(key: string) {
    const fields = config.visible_fields || [];
    setConfig(c => ({
      ...c,
      visible_fields: fields.includes(key) ? fields.filter(f => f !== key) : [...fields, key],
    }));
  }

  function updateStyle(key: string, val: string) {
    setConfig(c => ({ ...c, styles: { ...c.styles, [key]: val } }));
  }

  function updateSigLabel(slot: 'left'|'center'|'right', val: string) {
    setConfig(c => ({ ...c, signature_labels: { ...c.signature_labels, [slot]: val } }));
  }

  async function save() {
    setSaving(true);
    try {
      await TemplateAPI.update(template.id, { name, config });
      onSaved();
      notify({ type: 'success', message: 'Template saved' });
    } catch { notify({ type: 'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        setConfig(parsed);
        notify({ type: 'success', message: 'Template config imported' });
      } catch { notify({ type: 'error', message: 'Invalid JSON file' }); }
    };
    reader.readAsText(file);
  }

  const previewTemplate = { ...template, name, config };

  const groups = [
    { label: 'Header',       keys: ['logo'] },
    { label: 'Payment Info', keys: ['voucher_no','date','payee_name','description','bank_name','cheque_no','account_name','currency','prepared_by'] },
    { label: 'Amounts',      keys: ['amount','amount_words'] },
    { label: 'Signatures',   keys: ['signature'] },
  ];

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Field toggles */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Template Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />
        </div>

        {groups.map(g => (
          <div key={g.label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{g.label}</p>
            <div className="space-y-1.5">
              {g.keys.map(key => {
                const field = VOUCHER_FIELDS.find(f => f.key === key);
                const visible = config.visible_fields?.includes(key) ?? true;
                return (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => toggleField(key)}
                      className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ${visible ? 'bg-gold-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{field?.label || key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Center: Live preview */}
      <div className="flex-1 min-w-0">
        <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center" style={{ minHeight: '500px' }}>
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', boxShadow: '0 12px 48px rgba(0,0,0,0.2)', borderRadius: '4px' }}>
            <VoucherA5 voucher={SAMPLE_VOUCHER} company={company} template={previewTemplate as VoucherTemplate} />
          </div>
        </div>
      </div>

      {/* Right: Styles */}
      <div className="w-56 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-4 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Styles</p>

        {[
          { key: 'headerBg',    label: 'Header BG',    default: '#0F172A' },
          { key: 'accentColor', label: 'Accent Color', default: '#2563EB' },
          { key: 'titleColor',  label: 'Title Color',  default: '#FFFFFF' },
        ].map(({ key, label, default: def }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input type="color"
                value={config.styles?.[key as keyof typeof config.styles] as string || def}
                onChange={e => updateStyle(key, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0.5 bg-transparent"
              />
              <input type="text"
                value={config.styles?.[key as keyof typeof config.styles] as string || def}
                onChange={e => updateStyle(key, e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>
        ))}

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Signature Labels</p>
          {(['left','center','right'] as const).map(slot => (
            <div key={slot} className="mb-2">
              <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{slot}</label>
              <input
                value={config.signature_labels?.[slot] || ''}
                onChange={e => updateSigLabel(slot, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <button onClick={save} disabled={saving}
            className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Template'}
          </button>

          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
          <button onClick={() => importRef.current?.click()}
            className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm py-2 rounded-xl flex items-center justify-center gap-2 transition">
            <Upload className="w-3.5 h-3.5" /> Import JSON
          </button>
        </div>
      </div>
    </div>
  );
}
