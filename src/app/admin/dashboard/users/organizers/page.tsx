import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import AdminOrganizersPage from '@/components/admin/admin-organizers-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function AdminOrganizersPageWrapper() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  return (
    <DashboardLayout session={session}>
      <AdminOrganizersPage />
    </DashboardLayout>
  );
}
