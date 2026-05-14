'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
  setAuth:   (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser:   (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('pv_token',   token);
        localStorage.setItem('pv_refresh', refreshToken);
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('pv_token');
        localStorage.removeItem('pv_refresh');
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'trustiva-auth', partialize: state => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }) }
  )
);
