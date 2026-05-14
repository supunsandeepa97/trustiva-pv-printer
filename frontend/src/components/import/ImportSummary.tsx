'use client';
import Link from 'next/link';
import { CheckCircle, AlertCircle, FileText, RotateCcw } from 'lucide-react';
import { useImportStore } from '@/store/importStore';

export default function ImportSummary() {
  const { lastResult, reset } = useImportStore();
  if (!lastResult) return null;

  const { importedRows, duplicateCount, errorCount } = lastResult;

  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Import Complete!</h2>
        <p className="text-slate-500">Your QuickBooks data has been imported successfully.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-emerald-700">{importedRows}</p>
          <p className="text-emerald-600 text-sm mt-1">Imported</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-amber-700">{duplicateCount}</p>
          <p className="text-amber-600 text-sm mt-1">Duplicates Skipped</p>
        </div>
        <div className={`${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
          <p className={`text-3xl font-bold ${errorCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>{errorCount}</p>
          <p className={`text-sm mt-1 ${errorCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Errors</p>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorCount} rows could not be imported (missing required fields like Payee, Amount, or Date).
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/payments"
          className="flex-1 bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
          <FileText className="w-4 h-4" /> View Payments
        </Link>
        <button onClick={reset}
          className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
          <RotateCcw className="w-4 h-4" /> Import Another
        </button>
      </div>
    </div>
  );
}
