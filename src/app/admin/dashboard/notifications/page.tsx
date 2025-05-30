// app/admin/dashboard/notifications/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationsPage } from '@/components/notification/notification-page';
import { getServerSideAuth } from '@/lib/auth-utils';

export default async function AdminNotifications() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  return (
    <DashboardLayout session={session}>
      <NotificationsPage />
    </DashboardLayout>
  );
}
