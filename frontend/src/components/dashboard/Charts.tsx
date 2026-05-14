'use client';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { DailyChartPoint, MonthlyChartPoint } from '@/types';

interface ChartsProps {
  dailyData:   DailyChartPoint[];
  monthlyData: MonthlyChartPoint[];
}

export default function Charts({ dailyData, monthlyData }: ChartsProps) {
  const daily = dailyData.map(d => ({
    date:  format(new Date(d.day), 'dd MMM'),
    count: parseInt(d.count),
  }));
  const monthly = monthlyData.map(d => ({
    month:  format(new Date(d.month), 'MMM yy'),
    volume: parseFloat(d.volume),
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-5 shadow-card">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Vouchers Printed (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daily} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
            <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Vouchers" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Monthly Payment Volume (LKR)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthly} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(v: number) => [`LKR ${v.toLocaleString()}`, 'Volume']} />
            <Area type="monotone" dataKey="volume" stroke="#10B981" strokeWidth={2} fill="url(#volGrad)" name="Volume" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
