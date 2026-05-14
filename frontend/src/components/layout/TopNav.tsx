'use client';
import { usePathname } from 'next/navigation';
import { Menu, Bell, LogOut, Settings, ChevronDown, UserCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { AuthAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/payments': 'Payment Print',
  '/settings': 'Settings',
};

export default function TopNav() {
  const pathname = usePathname();
  const { toggleSidebar, notifications } = useUIStore();
  const { user, logout } = useAuth();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [pendingCount,  setPendingCount]  = useState(0);
  const isSuperAdmin = user?.role === 'super_admin';
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    async function fetchPending() {
      try {
        const res = await AuthAPI.getPendingRequests();
        setPendingCount(res.data.data.length);
      } catch { /* silent */ }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const title = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] || 'TRUSTIVA PRINT SUITE';

  return (
    <header className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="text-slate-500 hover:text-slate-800 transition p-1.5 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-slate-800 font-semibold text-base" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
            {title}
          </h1>
          <p className="text-slate-400 text-xs hidden sm:block">TRUSTIVA PRINT SUITE · Enterprise Edition</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Pending requests badge (super_admin only) */}
        {isSuperAdmin && pendingCount > 0 && (
          <Link href="/settings" className="relative text-amber-500 hover:text-amber-600 transition p-1.5" title="Pending access requests">
            <UserCheck className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center bg-amber-500 text-white">
              {pendingCount}
            </span>
          </Link>
        )}

        {/* Notifications bell */}
        <button aria-label="Notifications" className="relative text-slate-500 hover:text-slate-800 transition p-1.5 rounded-lg">
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
              style={{ background: '#C9A227', color: '#0F172A' }}
            >
              {notifications.length}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #C9A227, #DDB820)', color: '#0F172A' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block font-medium">{user?.name}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                <Settings className="w-4 h-4" /> Settings
              </a>
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
