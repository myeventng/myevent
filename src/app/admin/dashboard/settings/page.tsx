import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { AdminSettings } from '@/components/admin/admin-settings';
import { redirect } from 'next/navigation';

export default async function AdminSettingsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);

  return (
    <DashboardLayout session={session}>
      <AdminSettings session={session} isUserSuperAdmin={isUserSuperAdmin} />
    </DashboardLayout>
  );
}
