import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationsPage } from '@/components/notification/notification-page';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminNotifications() {
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
      <NotificationsPage isAdmin={true} />
    </DashboardLayout>
  );
}
