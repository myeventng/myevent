import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OrganizerEventsTable } from '@/components/organizer/organizer-events-table';
import { getUserEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function OrganizerEvents() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow users and admins
    subRoles: ['ORGANIZER', 'STAFF', 'SUPER_ADMIN'], // But only organizers and admin roles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Fetch user's events
  const response = await getUserEvents();
  const events = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Events</h1>
            <p className="text-muted-foreground">
              Manage your events, track ticket sales, and view analytics.
            </p>
          </div>
        </div>

        <OrganizerEventsTable
          initialData={events ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
