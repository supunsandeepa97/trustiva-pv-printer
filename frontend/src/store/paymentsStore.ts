'use client';
import { create } from 'zustand';
import type { PaymentVoucher } from '@/types';

interface PaymentsFilters {
  status?:    string;
  date_from?: string;
  date_to?:   string;
  search?:    string;
  import_id?: string;
  page?:      number;
  limit?:     number;
  sort?:      string;
  order?:     string;
}

interface PaymentsState {
  vouchers:   PaymentVoucher[];
  total:      number;
  page:       number;
  limit:      number;
  filters:    PaymentsFilters;
  selected:   string[];
  loading:    boolean;
  setVouchers:(rows: PaymentVoucher[], total: number, page: number, limit: number) => void;
  setFilters: (filters: PaymentsFilters) => void;
  setLoading: (v: boolean) => void;
  toggleSelected: (id: string) => void;
  setAllSelected: (ids: string[]) => void;
  clearSelected:  () => void;
}

export const usePaymentsStore = create<PaymentsState>((set) => ({
  vouchers: [],
  total:    0,
  page:     1,
  limit:    50,
  filters:  {},
  selected: [],
  loading:  false,
  setVouchers: (vouchers, total, page, limit) => set({ vouchers, total, page, limit }),
  setFilters:  filters => set({ filters, selected: [] }),
  setLoading:  loading => set({ loading }),
  toggleSelected: id => set(s => ({
    selected: s.selected.includes(id) ? s.selected.filter(x => x !== id) : [...s.selected, id],
  })),
  setAllSelected: ids => set({ selected: ids }),
  clearSelected:  () => set({ selected: [] }),
}));
