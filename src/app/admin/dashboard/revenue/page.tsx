// src/app/admin/dashboard/revenue/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminRevenueAnalytics } from '@/components/admin/admin-revenue-analytics';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminRevenuePage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  return (
    <DashboardLayout session={session}>
      <AdminRevenueAnalytics />
    </DashboardLayout>
  );
}
