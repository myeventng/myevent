// app/admin/dashboard/events/pending/page.tsx

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PendingEventsTable } from '@/components/admin/pending-events-table';
import { getEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function PendingEventsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Fetch all events and filter for pending ones
  const response = await getEvents(false); // false to get all events
  const allEvents: any[] =
    response && response.success && Array.isArray(response.data)
      ? response.data
      : [];

  // Filter for pending events only
  const pendingEvents = allEvents.filter(
    (event: any) =>
      event.publishedStatus === 'PENDING_REVIEW' && !event.isCancelled
  );

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pending Events</h1>
            <p className="text-muted-foreground">
              Review and approve events submitted by organizers. You can approve
              events individually or in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingEvents.length} Pending
            </div>
          </div>
        </div>

        <PendingEventsTable
          initialData={pendingEvents ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
