'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useReactToPrint } from 'react-to-print';
import {
  Upload, Eye, Printer, FileSpreadsheet,
  RotateCcw, CheckSquare, Square, Loader2,
  AlertCircle, ChevronRight, ChevronLeft, FileText, Banknote,
} from 'lucide-react';
import { ImportAPI, PaymentAPI, CompanyAPI, TemplateAPI, SettingsAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import VoucherA5 from '@/components/voucher/VoucherA5';
import ChequeSlip from '@/components/voucher/ChequeSlip';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { PaymentVoucher, Company, VoucherTemplate, ImportPreviewData } from '@/types';

type Step = 1 | 2 | 3;
type PrintType = 'voucher' | 'cheque';

interface BankAccount { id: string; name: string; branch?: string; account_no?: string; }

const STEPS = [
  { id: 1, label: 'Import File', icon: Upload  },
  { id: 2, label: 'Preview',    icon: Eye      },
  { id: 3, label: 'Print',      icon: Printer  },
];

/* ─── Step progress bar ─────────────────────────────────────── */
function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 no-print">
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300"
                style={
                  done   ? { background: '#10B981', color: '#fff' } :
                  active ? { background: 'linear-gradient(135deg,#C9A227,#F0CE35)', color: '#0F172A', boxShadow: '0 0 0 4px rgba(201,162,39,0.2)' } :
                           { background: '#E2E8F0', color: '#94A3B8' }
                }
              >
                {done ? '✓' : s.id}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: done ? '#10B981' : active ? '#C9A227' : '#94A3B8' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-20 sm:w-32 h-0.5 mb-5 mx-2 transition-all duration-500"
                style={{ background: done ? '#10B981' : '#E2E8F0' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function PaymentPrintPage() {
  const notify = useUIStore(s => s.addNotification);

  const [step,        setStep]        = useState<Step>(1);
  const [company,     setCompany]     = useState<Company | null>(null);
  const [template,    setTemplate]    = useState<VoucherTemplate | null>(null);

  // Banks
  const [banks,        setBanks]        = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);

  // Step 1
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Step 2
  const [vouchers,    setVouchers]    = useState<PaymentVoucher[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [importStats, setImportStats] = useState<{ imported: number; duplicates: number } | null>(null);

  // Step 3
  const [printType, setPrintType] = useState<PrintType>('voucher');
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  useEffect(() => {
    Promise.all([CompanyAPI.get(), TemplateAPI.list(), SettingsAPI.get()])
      .then(([cRes, tRes, sRes]) => {
        setCompany(cRes.data.data);
        const list: VoucherTemplate[] = tRes.data.data || [];
        setTemplate(list.find(t => t.is_default) || list[0] || null);
        try {
          const b: BankAccount[] = JSON.parse(sRes.data.data?.bank_accounts || '[]');
          setBanks(b);
          if (b.length === 1) setSelectedBank(b[0]);
        } catch { setBanks([]); }
      })
      .catch(err => {
        console.warn('[PaymentPrintPage] Init load failed:', err?.message ?? err);
        notify({ type: 'error', message: 'Failed to load initial data. Please refresh the page.' });
      });
  }, []);

  /* ── Dropzone ────────────────────────────────────────────── */
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);

      const { data: upData } = await ImportAPI.upload(form, pct => setProgress(Math.min(pct, 75)));
      const preview: ImportPreviewData = upData.data;
      setProgress(85);

      const { data: confData } = await ImportAPI.confirm({
        filePath:       preview.file.path,
        filename:       preview.file.originalName,
        format:         preview.file.format,
        mapping:        preview.suggestedMapping,
        skipDuplicates: false,
      });
      setProgress(95);

      const { importId, importedRows, duplicateCount } = confData.data;
      setImportStats({ imported: importedRows, duplicates: duplicateCount || 0 });

      const { data: vData } = await PaymentAPI.list({ import_id: importId, limit: 500 });
      const rawRows: PaymentVoucher[] = vData.data?.items ?? vData.data?.rows ?? [];
      // Override bank_name from the selected bank (not from the import file)
      const rows = selectedBank
        ? rawRows.map(v => ({ ...v, bank_name: selectedBank.name }))
        : rawRows;
      setVouchers(rows);
      setSelected(new Set(rows.map((v: PaymentVoucher) => v.id)));
      setProgress(100);
      setStep(2);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Import failed — check file format and column names.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }, [selectedBank]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv':   ['.csv'],
      'text/plain': ['.txt'],
    },
    multiple: false,
    disabled: uploading || (banks.length > 0 && !selectedBank),
  });

  /* ── Helpers ─────────────────────────────────────────────── */
  function reset() {
    setStep(1);
    setVouchers([]);
    setSelected(new Set());
    setImportStats(null);
    setUploadError('');
    setProgress(0);
    if (banks.length === 1) setSelectedBank(banks[0]);
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === vouchers.length ? new Set() : new Set(vouchers.map(v => v.id)));
  }

  const selectedVouchers = vouchers.filter(v => selected.has(v.id));
  const allSelected      = selected.size === vouchers.length && vouchers.length > 0;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto">
      <StepBar current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
        >

          {/* ══ STEP 1: IMPORT ══════════════════════════════════ */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-card p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
                Import Payment File
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Drop your QuickBooks export and the system will automatically detect and import all payments.
              </p>

              {/* Bank selector */}
              {banks.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Bank Account <span style={{ color: '#C9A227' }}>*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {banks.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBank(b)}
                        className="text-left p-3 rounded-xl border-2 transition-all"
                        style={selectedBank?.id === b.id ? {
                          borderColor: '#C9A227',
                          background: 'rgba(201,162,39,0.06)',
                          boxShadow: '0 0 0 3px rgba(201,162,39,0.15)',
                        } : { borderColor: '#E2E8F0', background: '#FAFAFA' }}
                      >
                        <p className="font-semibold text-sm text-slate-800">{b.name}</p>
                        {(b.branch || b.account_no) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {[b.branch, b.account_no].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                  {!selectedBank && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Please select a bank before importing
                    </p>
                  )}
                </div>
              )}

              {banks.length === 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No bank accounts configured. Go to <strong>Settings → Bank Accounts</strong> to add one.
                </div>
              )}

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className="relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200"
                style={{
                  borderColor:     isDragActive ? '#C9A227' : '#E2E8F0',
                  backgroundColor: isDragActive ? 'rgba(201,162,39,0.04)' : '#FAFAFA',
                  opacity:         uploading ? 0.7 : 1,
                  pointerEvents:   uploading ? 'none' : 'auto',
                }}
              >
                <input {...getInputProps()} />

                {uploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#C9A227' }} />
                    <div>
                      <p className="font-semibold text-slate-700">Processing file…</p>
                      <p className="text-slate-400 text-sm mt-1">{progress < 80 ? 'Uploading' : progress < 95 ? 'Mapping columns' : 'Saving records'}…</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg,#C9A227,#F0CE35)' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{progress}%</p>
                  </div>
                ) : isDragActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-14 h-14" style={{ color: '#C9A227' }} />
                    <p className="font-semibold text-lg" style={{ color: '#C9A227' }}>Release to import</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,162,39,0.1)' }}>
                      <Upload className="w-8 h-8" style={{ color: '#C9A227' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-base">Drag &amp; drop your file here</p>
                      <p className="text-slate-400 text-sm mt-1">
                        or <span className="font-medium" style={{ color: '#C9A227' }}>browse to upload</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {['.xlsx', '.csv', '.txt'].map(ext => (
                        <span key={ext} className="bg-slate-100 text-slate-500 text-xs font-mono px-2.5 py-1 rounded-lg">{ext}</span>
                      ))}
                    </div>
                    <p className="text-slate-300 text-xs">QuickBooks Desktop 2018 export format supported</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </motion.div>
              )}
            </div>
          )}

          {/* ══ STEP 2: PREVIEW ═════════════════════════════════ */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
                    Review Imported Records
                  </h2>
                  {importStats && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      <span className="font-medium text-emerald-600">{importStats.imported} imported</span>
                      {importStats.duplicates > 0 && (
                        <span className="text-slate-400 ml-2">· {importStats.duplicates} duplicates skipped</span>
                      )}
                      <span className="text-slate-400 ml-2">· {selected.size} selected</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition"
                >
                  <RotateCcw className="w-4 h-4" /> Start over
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleAll} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition">
                          {allSelected
                            ? <CheckSquare className="w-4 h-4" style={{ color: '#C9A227' }} />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      {['Date', 'Payee', 'Description', 'Cheque No', 'Amount'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {vouchers.map((v, i) => {
                      const isSelected = selected.has(v.id);
                      return (
                        <tr
                          key={v.id}
                          onClick={() => toggleRow(v.id)}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                          style={isSelected ? { backgroundColor: 'rgba(201,162,39,0.04)' } : {}}
                        >
                          <td className="px-4 py-3">
                            {isSelected
                              ? <CheckSquare className="w-4 h-4" style={{ color: '#C9A227' }} />
                              : <Square className="w-4 h-4 text-slate-300" />}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(v.date)}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{v.payee_name}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{v.description || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{v.cheque_no || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap text-right">
                            {formatCurrency(v.amount, v.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={reset}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-xl transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Import Different File
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl transition disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A', boxShadow: '0 4px 14px rgba(201,162,39,0.35)' }}
                >
                  Print {selected.size} Selected <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: PRINT ════════════════════════════════════ */}
          {step === 3 && (
            <div className="flex gap-6 flex-col lg:flex-row">

              {/* Left: controls */}
              <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
                {/* Print type */}
                <div className="bg-white rounded-2xl shadow-card p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Print Format</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { type: 'voucher', label: 'Payment\nVoucher', icon: FileText  },
                      { type: 'cheque',  label: 'Cheque\nSlip',     icon: Banknote  },
                    ] as const).map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setPrintType(type)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center"
                        style={printType === type ? {
                          borderColor:     '#C9A227',
                          background:      'rgba(201,162,39,0.06)',
                          color:           '#C9A227',
                          boxShadow:       '0 0 0 3px rgba(201,162,39,0.15)',
                        } : {
                          borderColor:     '#E2E8F0',
                          color:           '#64748B',
                        }}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-semibold whitespace-pre-line leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-2xl shadow-card p-5 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Selected</span>
                    <span className="font-semibold text-slate-800">{selectedVouchers.length} vouchers</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Format</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {printType === 'voucher' ? 'A5 Payment Voucher' : 'A5 Cheque Slip'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2 mt-2">
                    <span className="text-slate-500">Total Amount</span>
                    <span className="font-bold" style={{ color: '#C9A227' }}>
                      {formatCurrency(selectedVouchers.reduce((s, v) => s + Number(v.amount), 0), 'LKR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => handlePrint()}
                    disabled={selectedVouchers.length === 0}
                    className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A', boxShadow: '0 4px 16px rgba(201,162,39,0.4)' }}
                  >
                    <Printer className="w-4 h-4" />
                    Print {selectedVouchers.length} {printType === 'voucher' ? 'Vouchers' : 'Cheques'}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 py-2.5 rounded-xl transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Preview
                  </button>
                </div>
              </div>

              {/* Right: live preview of first selected */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl shadow-card p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                    Preview — {selectedVouchers[0]?.payee_name || 'No selection'}
                    {selectedVouchers.length > 1 && (
                      <span className="ml-2 font-normal text-slate-400 normal-case">
                        +{selectedVouchers.length - 1} more will print
                      </span>
                    )}
                  </p>
                  {selectedVouchers.length > 0 && company ? (
                    <div className="flex justify-center">
                      <div
                        style={{
                          transform:       'scale(0.65)',
                          transformOrigin: 'top center',
                          marginBottom:    printType === 'cheque' ? '-74mm' : '-104mm',
                        }}
                      >
                        {printType === 'voucher' ? (
                          <VoucherA5 voucher={selectedVouchers[0]} company={company} template={template ?? undefined} />
                        ) : (
                          <ChequeSlip voucher={selectedVouchers[0]} company={company} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                      No vouchers selected
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Hidden print container (off-screen, not display:none so react-to-print can compute layout) ── */}
      {company && (
        <div style={{ position: 'absolute', top: 0, left: '-9999px', overflow: 'hidden', pointerEvents: 'none' }}>
          <div ref={printRef}>
            {selectedVouchers.map((v, i) => (
              <div
                key={v.id}
                style={{ pageBreakAfter: i < selectedVouchers.length - 1 ? 'always' : 'auto' }}
              >
                {printType === 'voucher'
                  ? <VoucherA5 voucher={v} company={company} template={template ?? undefined} />
                  : <ChequeSlip voucher={v} company={company} />
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
