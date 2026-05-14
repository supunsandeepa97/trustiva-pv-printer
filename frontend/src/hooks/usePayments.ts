'use client';
import { useCallback } from 'react';
import { PaymentAPI } from '@/lib/api';
import { usePaymentsStore } from '@/store/paymentsStore';
import { useUIStore } from '@/store/uiStore';

export function usePayments() {
  const store = usePaymentsStore();
  const notify = useUIStore(s => s.addNotification);

  const fetchVouchers = useCallback(async (filters = store.filters) => {
    store.setLoading(true);
    try {
      const { data } = await PaymentAPI.list(filters);
      const { rows, total, page, limit } = data.data;
      store.setVouchers(rows, total, page, limit);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load payments';
      notify({ type: 'error', message: msg });
    } finally {
      store.setLoading(false);
    }
  }, [store, notify]);

  async function updateVoucher(id: string, updates: object) {
    const { data } = await PaymentAPI.update(id, updates);
    await fetchVouchers();
    return data.data;
  }

  async function deleteVoucher(id: string) {
    await PaymentAPI.delete(id);
    await fetchVouchers();
    notify({ type: 'success', message: 'Voucher cancelled' });
  }

  async function bulkAction(ids: string[], action: string) {
    await PaymentAPI.bulkAction(ids, action);
    store.clearSelected();
    await fetchVouchers();
    notify({ type: 'success', message: `Bulk action applied to ${ids.length} vouchers` });
  }

  return { ...store, fetchVouchers, updateVoucher, deleteVoucher, bulkAction };
}
