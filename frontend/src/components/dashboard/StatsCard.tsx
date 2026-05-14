'use client';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label:     string;
  value:     string | number;
  icon:      LucideIcon;
  color?:    'navy' | 'gold' | 'emerald' | 'amber';
  subtitle?: string;
}

const colorMap = {
  navy: {
    bg:   'bg-navy-900',
    icon: 'bg-white/10 text-white',
    text: 'text-white',
    sub:  'text-slate-300',
  },
  gold: {
    bg:   '',
    icon: '',
    text: 'text-white',
    sub:  'text-yellow-100',
  },
  emerald: {
    bg:   'bg-white',
    icon: 'bg-emerald-100 text-emerald-600',
    text: 'text-slate-900',
    sub:  'text-slate-500',
  },
  amber: {
    bg:   'bg-white',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-slate-900',
    sub:  'text-slate-500',
  },
};

export default function StatsCard({ label, value, icon: Icon, color = 'emerald', subtitle }: StatsCardProps) {
  const c = colorMap[color];

  if (color === 'gold') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, #C9A227 0%, #DDB820 60%, #A07D1A 100%)',
          boxShadow: '0 4px 20px rgba(201,162,39,0.45)',
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium mb-0.5 text-yellow-100">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs mt-0.5 text-yellow-100">{subtitle}</p>}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl p-5 shadow-card flex items-center gap-4', c.bg)}
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className={cn('text-xs font-medium mb-0.5', c.sub)}>{label}</p>
        <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
        {subtitle && <p className={cn('text-xs mt-0.5', c.sub)}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}
