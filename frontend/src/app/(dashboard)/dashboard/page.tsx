'use client';
import { useEffect, useState } from 'react';
import { Loader2, FileText, Printer, Clock, TrendingUp } from 'lucide-react';
import { DashboardAPI } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency } from '@/lib/utils';
import StatsCard   from '@/components/dashboard/StatsCard';
import Charts      from '@/components/dashboard/Charts';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import type { DashboardStats, DailyChartPoint, MonthlyChartPoint, ImportRecord } from '@/types';

interface RecentPrint {
  printed_at: string;
  printed_by: string;
  voucher_no: string;
  payee_name: string;
  amount: number;
}

interface DashboardData {
  stats:          DashboardStats;
  dailyChart:     DailyChartPoint[];
  monthlyChart:   MonthlyChartPoint[];
  recentImports:  ImportRecord[];
  recentPrints:   RecentPrint[];
}

export default function DashboardPage() {
  const notify = useUIStore(s => s.addNotification);
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardAPI.getStats()
      .then(r => setData(r.data.data))
      .catch(() => notify({ type: 'error', message: 'Failed to load dashboard data' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C9A227' }} />
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Unable to load dashboard
    </div>
  );

  const { stats, dailyChart, monthlyChart, recentImports, recentPrints } = data;
  const totalAmount = parseFloat(stats.total_printed_amount || '0');

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Total Vouchers"
          value={Number(stats.total).toLocaleString()}
          icon={FileText}
          color="emerald"
          subtitle={`${stats.pending} pending`}
        />
        <StatsCard
          label="Printed"
          value={Number(stats.printed).toLocaleString()}
          icon={Printer}
          color="gold"
          subtitle={formatCurrency(totalAmount, 'LKR')}
        />
        <StatsCard
          label="Pending"
          value={Number(stats.pending).toLocaleString()}
          icon={Clock}
          color="amber"
          subtitle="Awaiting print"
        />
        <StatsCard
          label="Cancelled"
          value={Number(stats.cancelled).toLocaleString()}
          icon={TrendingUp}
          color="navy"
          subtitle={`${stats.draft} draft`}
        />
      </div>

      {/* Charts */}
      <Charts dailyData={dailyChart} monthlyData={monthlyChart} />

      {/* Activity feed */}
      <ActivityFeed recentImports={recentImports} recentPrints={recentPrints} />
    </div>
  );
}
