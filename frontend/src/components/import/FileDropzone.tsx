'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImport } from '@/hooks/useImport';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export default function FileDropzone() {
  const { uploadFile, uploadProgress } = useImport();
  const notify  = useUIStore(s => s.addNotification);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    try {
      await uploadFile(file);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed';
      notify({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [uploadFile, notify]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Upload QuickBooks Export</h2>
        <p className="text-slate-500 text-sm">Supports Excel (.xlsx), CSV, and Tab-Delimited (.txt) files</p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
          isDragActive ? 'border-gold-500 bg-gold-50' : 'border-slate-300 bg-white hover:border-gold-400 hover:bg-slate-50',
          loading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <>
              <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
              <p className="text-gold-600 font-semibold">Processing file…</p>
              {uploadProgress > 0 && (
                <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gold-500 rounded-full"
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <p className="text-slate-400 text-sm">{uploadProgress}% uploaded</p>
            </>
          ) : isDragActive ? (
            <>
              <FileSpreadsheet className="w-12 h-12 text-gold-500" />
              <p className="text-gold-600 font-semibold text-lg">Drop file here</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gold-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-gold-600" />
              </div>
              <div>
                <p className="text-slate-700 font-semibold">Drag & drop your file here</p>
                <p className="text-slate-400 text-sm mt-1">or <span className="text-gold-600 font-medium">browse to upload</span></p>
              </div>
              <div className="flex gap-2">
                {['.xlsx', '.csv', '.txt'].map(ext => (
                  <span key={ext} className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-lg">{ext}</span>
                ))}
              </div>
              <p className="text-slate-400 text-xs">Maximum file size: 10 MB</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-blue-800 mb-1">QB Desktop 2018 Export Instructions</p>
        <p className="text-blue-700">In QuickBooks: Reports → Vendors &amp; Payables → Vendor Balance Detail → Export to Excel. Or use File → Export tab-delimited.</p>
      </div>
    </div>
  );
}
