'use client';
import { useAuthStore } from '@/store/authStore';
import { AuthAPI } from '@/lib/api';
import type { Role } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  async function login(email: string, password: string) {
    const { data } = await AuthAPI.login(email, password);
    const { token, refreshToken, user: userData } = data.data;
    setAuth(userData, token, refreshToken);
    return userData;
  }

  function logout() {
    clearAuth();
    window.location.href = '/login';
  }

  function isAllowed(roles: Role[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return { user, isAuthenticated, login, logout, isAllowed };
}
