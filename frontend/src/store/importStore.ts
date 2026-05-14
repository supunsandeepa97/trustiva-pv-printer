'use client';
import { create } from 'zustand';
import type { ImportPreviewData, ColumnMapping } from '@/types';

interface ImportState {
  step:             number;
  preview:          ImportPreviewData | null;
  confirmedMapping: ColumnMapping | null;
  skipDuplicates:   boolean;
  lastResult:       { importId: string; importedRows: number; duplicateCount: number; errorCount: number } | null;
  uploadProgress:   number;
  setStep:       (step: number) => void;
  setPreview:    (preview: ImportPreviewData) => void;
  setMapping:    (mapping: ColumnMapping) => void;
  setSkipDups:   (v: boolean) => void;
  setResult:     (result: ImportState['lastResult']) => void;
  setProgress:   (pct: number) => void;
  reset:         () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  step:             1,
  preview:          null,
  confirmedMapping: null,
  skipDuplicates:   true,
  lastResult:       null,
  uploadProgress:   0,
  setStep:     step    => set({ step }),
  setPreview:  preview => set({ preview, step: 2 }),
  setMapping:  mapping => set({ confirmedMapping: mapping, step: 3 }),
  setSkipDups: v       => set({ skipDuplicates: v }),
  setResult:   result  => set({ lastResult: result, step: 5 }),
  setProgress: pct     => set({ uploadProgress: pct }),
  reset:       ()      => set({ step: 1, preview: null, confirmedMapping: null, lastResult: null, uploadProgress: 0 }),
}));
