import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserTicketsPage } from '@/components/tickets/user-ticket-page';
import { OrganizerAnalytics } from '@/components/organizer/organizer-analytics';
import { getServerSideAuth } from '@/lib/auth-server';
import { getOrganizerStats } from '@/actions/ticket.actions';
import { Badge } from '@/components/ui/badge';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';
import { redirect } from 'next/navigation';

async function getInitialData() {
  try {
    const [statsResponse, platformFee] = await Promise.all([
      getOrganizerStats(),
      getPlatformFeePercentage(),
    ]);

    return {
      initialStats: statsResponse.success ? statsResponse.data : null,
      platformFee,
    };
  } catch (error) {
    console.error('Error fetching initial analytics data:', error);
    return {
      initialStats: null,
      platformFee: 5, // Default fallback
    };
  }
}

export default async function Dashboard() {
  const { initialStats, platformFee } = await getInitialData();
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow both regular users and admins
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Check user subrole
  const isOrganizer = session.user.subRole === 'ORGANIZER';
  const isAdmin = session.user.role === 'ADMIN';

  // If user is an organizer, render the organizer dashboard
  if (isOrganizer || isAdmin) {
    // Get initial stats server-side for organizers
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
              <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
              <p className="text-muted-foreground">
                Track your events, revenue, and payout management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                {initials}
              </div>
              <Badge variant={isOrganizer ? 'default' : 'destructive'}>
                {isAdmin ? 'ADMIN' : 'ORGANIZER'}
              </Badge>
            </div>
          </div>

          <OrganizerAnalytics
            initialStats={initialStats}
            initialPlatformFee={platformFee}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Default: render user tickets page for ordinary users
  return (
    <DashboardLayout session={session}>
      <UserTicketsPage />
    </DashboardLayout>
  );
}
