'use client';
import { ImportAPI } from '@/lib/api';
import { useImportStore } from '@/store/importStore';
import { useUIStore } from '@/store/uiStore';
import type { ColumnMapping } from '@/types';

export function useImport() {
  const store  = useImportStore();
  const notify = useUIStore(s => s.addNotification);

  async function uploadFile(file: File) {
    store.setProgress(0);
    const form = new FormData();
    form.append('file', file);
    const { data } = await ImportAPI.upload(form, pct => store.setProgress(pct));
    store.setPreview(data.data);
    return data.data;
  }

  async function runImport(mapping: ColumnMapping, skipDuplicates: boolean) {
    if (!store.preview) throw new Error('No file uploaded');
    const { data } = await ImportAPI.confirm({
      filePath:       store.preview.file.path,
      filename:       store.preview.file.originalName,
      format:         store.preview.file.format,
      mapping,
      skipDuplicates,
    });
    store.setResult(data.data);
    notify({ type: 'success', message: `Imported ${data.data.importedRows} vouchers successfully` });
    return data.data;
  }

  return { ...store, uploadFile, runImport };
}
