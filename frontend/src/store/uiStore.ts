'use client';
import { create } from 'zustand';

export interface Notification {
  id:        string;
  type:      'success' | 'error' | 'info' | 'warning';
  message:   string;
  createdAt: number;
}

interface UIState {
  sidebarOpen:    boolean;
  notifications:  Notification[];
  notifHistory:   Notification[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar:  () => void;
  addNotification:(notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification:    (id: string) => void;
  clearAllNotifications: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen:  true,
  notifications: [],
  notifHistory:  [],
  setSidebarOpen: open => set({ sidebarOpen: open }),
  toggleSidebar:  ()   => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (notification) => {
    const id = Date.now().toString();
    const n: Notification = { id, createdAt: Date.now(), ...notification };
    set(s => ({
      notifications: [...s.notifications, n],
      notifHistory:  [n, ...s.notifHistory].slice(0, 50),
    }));
    setTimeout(() => get().removeNotification(id), 4500);
  },
  removeNotification:    id  => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  clearAllNotifications: ()  => set({ notifHistory: [] }),
}));
