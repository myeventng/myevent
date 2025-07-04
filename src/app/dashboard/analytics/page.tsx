import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { OrganizerAnalytics } from '@/components/organizer/organizer-analytics';
import { getOrganizerStats } from '@/actions/ticket.actions';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

export default async function AnalyticsPage() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  // Check if user is an organizer or admin
  const isUserOrganizer = session.user.subRole === 'ORGANIZER';
  const isAdmin = session.user.role === 'ADMIN';

  if (!isUserOrganizer && !isAdmin) {
    redirect('/dashboard'); // Redirect non-organizers to regular dashboard
  }

  // Get initial stats server-side
  let initialStats = null;
  try {
    const statsResponse = await getOrganizerStats();
    if (statsResponse.success) {
      initialStats = statsResponse.data;
    }
  } catch (error) {
    console.error('Error loading initial stats:', error);
  }

  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your event performance and revenue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {initials}
            </div>
            <Badge variant={isUserOrganizer ? 'default' : 'destructive'}>
              {isAdmin ? 'ADMIN' : 'ORGANIZER'}
            </Badge>
          </div>
        </div>

        <OrganizerAnalytics initialStats={initialStats} />
      </div>
    </DashboardLayout>
  );
}
