'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Download, X, Check } from 'lucide-react';
import { usePaymentsStore } from '@/store/paymentsStore';
import { usePayments } from '@/hooks/usePayments';
import { usePrint } from '@/hooks/usePrint';

export default function BulkActions() {
  const { selected, clearSelected } = usePaymentsStore();
  const { bulkAction } = usePayments();
  const { bulkDownloadPDF } = usePrint();

  return (
    <AnimatePresence>
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="bg-navy-900 text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap shadow-lg"
        >
          <span className="text-sm font-semibold">{selected.length} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => bulkAction(selected, 'mark_printed')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition"
          >
            <Printer className="w-4 h-4" /> Mark Printed
          </button>
          <button
            onClick={() => bulkDownloadPDF(selected)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-sm transition"
          >
            <Download className="w-4 h-4" /> Download PDFs
          </button>
          <button
            onClick={() => bulkAction(selected, 'cancel')}
            className="flex items-center gap-1.5 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-lg text-sm transition"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={clearSelected} className="text-slate-400 hover:text-white p-1 transition" title="Deselect all">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
