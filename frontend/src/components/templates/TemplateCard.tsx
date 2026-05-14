'use client';
import { Star, Copy, Trash2, Download, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoucherTemplate } from '@/types';
import { TemplateAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';

interface TemplateCardProps {
  template:   VoucherTemplate;
  onSelect:   (t: VoucherTemplate) => void;
  onRefresh:  () => void;
  isSelected: boolean;
}

export default function TemplateCard({ template, onSelect, onRefresh, isSelected }: TemplateCardProps) {
  const notify = useUIStore(s => s.addNotification);

  async function setDefault() {
    try {
      await TemplateAPI.setDefault(template.id);
      onRefresh();
      notify({ type: 'success', message: `"${template.name}" set as default` });
    } catch { notify({ type: 'error', message: 'Failed to set default' }); }
  }

  async function duplicate() {
    try {
      await TemplateAPI.duplicate(template.id);
      onRefresh();
      notify({ type: 'success', message: 'Template duplicated' });
    } catch { notify({ type: 'error', message: 'Failed to duplicate' }); }
  }

  async function deleteTemplate() {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await TemplateAPI.delete(template.id);
      onRefresh();
      notify({ type: 'success', message: 'Template deleted' });
    } catch (err: unknown) {
      notify({ type: 'error', message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed' });
    }
  }

  function exportTemplate() {
    const json = JSON.stringify(template.config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${template.name.replace(/\s+/g, '-')}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div
      onClick={() => onSelect(template)}
      className={cn(
        'bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected ? 'border-gold-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate text-sm">{template.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{template.paper_size?.replace('_', ' ') || 'A5 Portrait'}</p>
        </div>
        {template.is_default && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
            <Star className="w-3 h-3" /> Default
          </span>
        )}
      </div>

      {/* Color preview */}
      <div className="flex gap-1.5 mb-3">
        {[template.config?.styles?.headerBg || '#0F172A', template.config?.styles?.accentColor || '#2563EB'].map((c, i) => (
          <div key={i} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => onSelect(template)} title="Edit" className="p-1.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition">
          <Edit className="w-3.5 h-3.5" />
        </button>
        {!template.is_default && (
          <button onClick={setDefault} title="Set Default" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={duplicate} title="Duplicate" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={exportTemplate} title="Export JSON" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Download className="w-3.5 h-3.5" />
        </button>
        {!template.is_default && (
          <button onClick={deleteTemplate} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
