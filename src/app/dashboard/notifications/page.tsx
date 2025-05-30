import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationsPage } from '@/components/notification/notification-page';
import { getServerSideAuth } from '@/lib/auth-utils';

export default async function UserNotifications() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  return (
    <DashboardLayout session={session}>
      <NotificationsPage />
    </DashboardLayout>
  );
}
