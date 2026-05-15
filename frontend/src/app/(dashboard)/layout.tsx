'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import Notifications from '@/components/layout/Notifications';
import CompanyWatermark from '@/components/layout/CompanyWatermark';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
      <Notifications />
      <CompanyWatermark />
    </div>
  );
}
