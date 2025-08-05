// src/app/admin/dashboard/payouts/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminPayoutsList } from '@/components/admin/admin-payouts-list';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminPayoutsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  return (
    <DashboardLayout session={session}>
      <AdminPayoutsList />
    </DashboardLayout>
  );
}



