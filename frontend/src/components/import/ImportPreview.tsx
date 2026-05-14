'use client';
import { CheckCircle, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { useImportStore } from '@/store/importStore';

interface ImportPreviewProps {
  onNext: () => void;
}

export default function ImportPreview({ onNext }: ImportPreviewProps) {
  const { preview } = useImportStore();
  if (!preview) return null;

  const { file, headers, previewRows } = preview;

  const formatBadge = (fmt: string) => {
    const labels: Record<string, string> = { xlsx: 'Excel XLSX', csv: 'CSV', txt: 'Tab-Delimited TXT' };
    return labels[fmt] || fmt.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-emerald-800">{file.originalName}</p>
          <p className="text-emerald-600 text-sm">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 px-2 py-0.5 rounded-md mr-2 font-medium">
              <FileSpreadsheet className="w-3 h-3" /> {formatBadge(file.format)}
            </span>
            {file.totalRows.toLocaleString()} rows detected · {headers.length} columns
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Preview (first 10 rows)</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 w-8">#</th>
                {headers.map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                  {headers.map(h => (
                    <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate">{row[h] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {file.totalRows > 10 && (
          <p className="text-slate-400 text-xs mt-2 text-center">… and {file.totalRows - 10} more rows</p>
        )}
      </div>

      <button onClick={onNext}
        className="w-full bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
        Looks correct, proceed to mapping <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
