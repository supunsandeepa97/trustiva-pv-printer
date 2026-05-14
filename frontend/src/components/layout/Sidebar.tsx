'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, History, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard, platformOnly: false },
  { href: '/payments',  label: 'Payment Print',   icon: Printer,         platformOnly: false },
  { href: '/history',   label: 'Payment History', icon: History,         platformOnly: false },
  { href: '/settings',  label: 'Settings',        icon: Settings,        platformOnly: false },
  { href: '/admin',     label: 'Platform Admin',  icon: ShieldCheck,     platformOnly: true  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 68 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative h-screen flex flex-col flex-shrink-0 overflow-hidden"
      style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F172A 0%, #0c1526 60%, #080e1a 100%)' }}
    >
      {/* Gold top accent line */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #C9A227, #F0CE35, #C9A227)' }} />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(201,162,39,0.2)' }}>
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
          <Image src="/assets/logo/logo.png" alt="Trustiva" width={32} height={32} className="object-contain" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="font-bold text-sm leading-tight tracking-wider" style={{ color: '#C9A227', fontFamily: 'Montserrat, Inter, sans-serif' }}>
                TRUST<span style={{ color: '#F0CE35' }}>IVA</span>
              </div>
              <div className="text-[10px] tracking-widest" style={{ color: 'rgba(201,162,39,0.5)' }}>PRINT SUITE</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute -right-3.5 top-[52px] w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-lg border"
        style={{ background: '#0F172A', borderColor: 'rgba(201,162,39,0.4)', color: '#C9A227' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.filter(item => user?.is_platform_admin ? item.platformOnly : !item.platformOnly).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} title={!sidebarOpen ? label : undefined} aria-current={active ? 'page' : undefined}>
              <div className={cn('sidebar-item', active ? 'active' : 'inactive')}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="whitespace-nowrap text-sm"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px flex-shrink-0" style={{ background: 'rgba(201,162,39,0.12)' }} />

      {/* User section */}
      <div className="p-3 flex-shrink-0">
        <div className={cn('flex items-center gap-3 px-2 py-2', !sidebarOpen && 'justify-center')}>
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #C9A227, #F0CE35)', color: '#0F172A' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{user?.name}</div>
                <div className="text-[10px] truncate capitalize" style={{ color: 'rgba(201,162,39,0.5)' }}>
                  {user?.role?.replace('_', ' ')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={logout} className="text-slate-500 hover:text-red-400 transition p-1" title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Gold bottom accent */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent, #C9A227, transparent)' }} />
    </motion.aside>
  );
}
