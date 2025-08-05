// src/app/dashboard/analytics/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OrganizerAnalytics } from '@/components/organizer/organizer-analytics';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function OrganizerAnalyticsPage() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  return (
    <DashboardLayout session={session}>
      <OrganizerAnalytics />
    </DashboardLayout>
  );
}