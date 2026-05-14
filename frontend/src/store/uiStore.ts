'use client';
import { create } from 'zustand';

interface Notification {
  id:      string;
  type:    'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  sidebarOpen:    boolean;
  notifications:  Notification[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar:  () => void;
  addNotification:(notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  notifications: [],
  setSidebarOpen: open => set({ sidebarOpen: open }),
  toggleSidebar:  ()   => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (notification) => {
    const id = Date.now().toString();
    set(s => ({ notifications: [...s.notifications, { id, ...notification }] }));
    setTimeout(() => get().removeNotification(id), 4500);
  },
  removeNotification: id => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}));
