'use client';
import { PrintAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { downloadBlob } from '@/lib/utils';

export function usePrint() {
  const notify = useUIStore(s => s.addNotification);

  async function downloadPDF(voucherId: string, filename: string, copies = 1) {
    try {
      const { data } = await PrintAPI.generatePDF(voucherId, copies);
      const blob = new Blob([data], { type: 'application/pdf' });
      downloadBlob(blob, filename);
      notify({ type: 'success', message: 'PDF downloaded' });
    } catch {
      notify({ type: 'error', message: 'Failed to generate PDF' });
    }
  }

  async function bulkDownloadPDF(ids: string[]) {
    try {
      const { data } = await PrintAPI.bulkPDF(ids);
      const blob = new Blob([data], { type: 'application/pdf' });
      downloadBlob(blob, `vouchers-bulk-${Date.now()}.pdf`);
      notify({ type: 'success', message: `${ids.length} vouchers exported to PDF` });
    } catch {
      notify({ type: 'error', message: 'Failed to generate bulk PDF' });
    }
  }

  async function markPrinted(id: string, copies = 1) {
    try {
      await PrintAPI.markPrinted(id, copies);
      notify({ type: 'success', message: 'Marked as printed' });
      return true;
    } catch {
      notify({ type: 'error', message: 'Printed, but updating status failed — please refresh.' });
      return false;
    }
  }

  return { downloadPDF, bulkDownloadPDF, markPrinted };
}
