import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationsPage } from '@/components/notification/notification-page';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function UserNotifications() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  return (
    <DashboardLayout session={session}>
      <NotificationsPage />
    </DashboardLayout>
  );
}
