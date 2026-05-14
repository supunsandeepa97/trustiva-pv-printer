'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

const icons = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};
const colors = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};
const iconColors = {
  success: 'text-emerald-500', error: 'text-red-500', info: 'text-blue-500', warning: 'text-amber-500',
};

export default function Notifications() {
  const { notifications, removeNotification } = useUIStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs w-full no-print">
      <AnimatePresence>
        {notifications.map(n => {
          const Icon = icons[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${colors[n.type]}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColors[n.type]}`} />
              <p className="flex-1 text-sm font-medium">{n.message}</p>
              <button onClick={() => removeNotification(n.id)} className="text-current opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
