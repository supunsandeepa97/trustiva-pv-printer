'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { PrintAPI, TemplateAPI } from '@/lib/api';
import { usePrint } from '@/hooks/usePrint';
import { useUIStore } from '@/store/uiStore';
import VoucherA5 from '@/components/voucher/VoucherA5';
import VoucherPreview from '@/components/voucher/VoucherPreview';
import type { PaymentVoucher, Company, VoucherTemplate } from '@/types';

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const notify  = useUIStore(s => s.addNotification);
  const { downloadPDF, markPrinted } = usePrint();

  const [voucher,   setVoucher]   = useState<PaymentVoucher | null>(null);
  const [company,   setCompany]   = useState<Company | null>(null);
  const [template,  setTemplate]  = useState<VoucherTemplate | undefined>(undefined);
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [copies,    setCopies]    = useState(1);
  const [loading,   setLoading]   = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${voucher?.voucher_no || 'voucher'}`,
    onAfterPrint: () => {
      // markPrinted reports its own success/failure toast — don't show an
      // unconditional "printed successfully" that would lie when the status
      // update fails (and would double-toast on success).
      if (voucher) void markPrinted(voucher.id, copies);
    },
    pageStyle: `
      @page { size: A5 portrait; margin: 0; }
      @media print { body { margin: 0; } .no-print { display: none !important; } }
    `,
  });

  useEffect(() => {
    async function load() {
      try {
        const [pvRes, tmplRes] = await Promise.all([
          PrintAPI.preview(id),
          TemplateAPI.list(),
        ]);
        const { voucher: v, company: c } = pvRes.data.data ?? {};
        if (!v || !c) throw new Error('Incomplete response from server');
        const templateList: VoucherTemplate[] = tmplRes.data.data ?? [];
        setVoucher(v);
        setCompany(c);
        setTemplates(templateList);
        const defaultTmpl = templateList.find((t: VoucherTemplate) => t.is_default);
        if (defaultTmpl) setTemplate(defaultTmpl);
      } catch {
        notify({ type: 'error', message: 'Failed to load voucher' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
    </div>
  );
  if (!voucher || !company) return <p className="text-center text-slate-500 py-16">Voucher not found.</p>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-900">Print Voucher — {voucher.voucher_no}</h1>
      </div>

      <div className="flex gap-6 flex-wrap lg:flex-nowrap">
        {/* Preview */}
        <div className="flex-1 min-w-0">
          <VoucherPreview ref={printRef} voucher={voucher} company={company} template={template} />
        </div>

        {/* Controls panel */}
        <div className="w-full lg:w-80 flex-shrink-0 no-print">
          <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
            <h2 className="font-bold text-slate-900">Print Controls</h2>

            {/* Template selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Template</label>
              <select
                value={template?.id || ''}
                onChange={e => setTemplate(templates.find(t => t.id === e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' ★' : ''}</option>)}
              </select>
            </div>

            {/* Copies */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Copies</label>
              <input type="number" min={1} max={10} value={copies}
                onChange={e => setCopies(parseInt(e.target.value) || 1)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <button
                onClick={handlePrint}
                className="w-full font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition text-navy-900"
                style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', boxShadow: '0 4px 14px rgba(201,162,39,0.4)' }}
              >
                <Printer className="w-4 h-4" /> Print Voucher
              </button>
              <button
                onClick={() => downloadPDF(voucher.id, `${voucher.voucher_no}.pdf`, copies)}
                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>

            {/* Voucher info */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
              {[
                ['Payee', voucher.payee_name],
                ['Amount', `${voucher.currency} ${Number(voucher.amount).toLocaleString()}`],
                ['Date', voucher.date],
                ['Status', voucher.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800 capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
