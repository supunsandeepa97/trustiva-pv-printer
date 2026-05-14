'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useImportStore } from '@/store/importStore';
import { useImport } from '@/hooks/useImport';
import FileDropzone from '@/components/import/FileDropzone';
import ImportPreview from '@/components/import/ImportPreview';
import ColumnMapper from '@/components/import/ColumnMapper';
import ImportSummary from '@/components/import/ImportSummary';
import { useUIStore } from '@/store/uiStore';
import type { ColumnMapping } from '@/types';

const STEPS = ['Upload', 'Preview', 'Map Columns', 'Import'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done    = stepNum < current;
        const active  = stepNum === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
              done ? 'bg-emerald-500 text-white' : active ? 'bg-gold-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>{done ? '✓' : stepNum}</div>
            <span className={`text-xs font-medium hidden sm:block ${active ? 'text-gold-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-px w-8 sm:w-12 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ImportsPage() {
  const store  = useImportStore();
  const { runImport } = useImport();
  const notify = useUIStore(s => s.addNotification);

  async function handleConfirmMapping(mapping: ColumnMapping) {
    try {
      await runImport(mapping, store.skipDuplicates);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import failed';
      notify({ type: 'error', message: msg });
    }
  }

  // Determine displayed step (1-4, step 5 = summary uses same view)
  const displayStep = store.step === 5 ? 4 : store.step;

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator current={displayStep} />
      <div className="bg-white rounded-2xl shadow-card p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={store.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {store.step === 1 && <FileDropzone />}
            {store.step === 2 && <ImportPreview onNext={() => store.setStep(3)} />}
            {store.step === 3 && <ColumnMapper onConfirm={handleConfirmMapping} />}
            {store.step === 5 && <ImportSummary />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
