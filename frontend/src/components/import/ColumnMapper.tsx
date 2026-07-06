'use client';
import { useState } from 'react';
import { ChevronRight, Loader2, Wand2 } from 'lucide-react';
import { useImportStore } from '@/store/importStore';
import type { ColumnMapping } from '@/types';

const TRUSTIVA_FIELDS = [
  { key: 'voucher_no',   label: 'Voucher No',      required: false },
  { key: 'date',         label: 'Date',             required: true  },
  { key: 'payee_name',   label: 'Payee Name',       required: true  },
  { key: 'amount',       label: 'Amount',           required: true  },
  { key: 'description',  label: 'Description/Memo', required: false },
  { key: 'bank_name',    label: 'Bank Name',        required: false },
  { key: 'cheque_no',    label: 'Cheque No',        required: false },
  { key: 'account_name', label: 'Account Name',     required: false },
  { key: 'currency',     label: 'Currency',         required: false },
  { key: 'prepared_by',  label: 'Prepared By',      required: false },
];

interface ColumnMapperProps {
  onConfirm: (mapping: ColumnMapping) => void | Promise<void>;
}

export default function ColumnMapper({ onConfirm }: ColumnMapperProps) {
  const { preview } = useImportStore();
  const [mapping, setMapping] = useState<ColumnMapping>(preview?.suggestedMapping || {});
  const [submitting, setSubmitting] = useState(false);

  if (!preview) return null;
  const { headers, previewRows } = preview;

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(mapping);
    } finally {
      setSubmitting(false);
    }
  }

  const getColIdx = (key: string) => mapping[key];
  const getSample = (colIdx: number) => {
    const sample = previewRows.slice(0, 3).map(r => Object.values(r)[colIdx]).filter(Boolean).join(', ');
    return sample ? `e.g. ${sample}` : '';
  };

  const missingRequired = TRUSTIVA_FIELDS.filter(f => f.required && getColIdx(f.key) === undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Map Columns</h2>
          <p className="text-slate-500 text-sm">Match your file's columns to Trustiva Print Suite fields</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gold-600 bg-gold-50 border border-gold-200 px-3 py-1.5 rounded-full">
          <Wand2 className="w-3.5 h-3.5" /> Auto-mapped
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-1/3">TRUSTIVA Field</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-1/3">Your File Column</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Sample Values</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {TRUSTIVA_FIELDS.map(field => {
              const colIdx   = getColIdx(field.key);
              const selected = colIdx !== undefined;
              return (
                <tr key={field.key} className={!selected && field.required ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{field.label}</span>
                    {field.required && <span className="ml-1.5 text-red-500 text-xs">*</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={colIdx !== undefined ? colIdx : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setMapping(m => ({ ...m, [field.key]: val === '' ? undefined as unknown as number : parseInt(val) }));
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
                    >
                      <option value="">— Not mapped —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[180px]">
                    {selected ? getSample(colIdx) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Required fields not mapped: <strong>{missingRequired.map(f => f.label).join(', ')}</strong>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={missingRequired.length > 0 || submitting}
        className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
          : <>Confirm Mapping &amp; Import <ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}
