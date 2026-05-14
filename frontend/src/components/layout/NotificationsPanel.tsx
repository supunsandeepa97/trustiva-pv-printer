'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell, Trash2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Notification } from '@/store/uiStore';

const icons = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};
const iconColors = {
  success: '#10B981',
  error:   '#EF4444',
  info:    '#3B82F6',
  warning: '#F59E0B',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifHistory, clearAllNotifications } = useUIStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-slate-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800 text-sm">Notifications</span>
          {notifHistory.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{notifHistory.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notifHistory.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifHistory.map((n: Notification) => {
              const Icon = icons[n.type];
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition">
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: iconColors[n.type] }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
