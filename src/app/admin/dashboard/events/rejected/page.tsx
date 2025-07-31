// app/admin/dashboard/events/rejected/page.tsx

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RejectedEventsTable } from '@/components/admin/rejected-events-table';
import { getEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function RejectedEventsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Fetch all events and filter for rejected ones
  const response = await getEvents(false); // false to get all events
  const allEvents =
    response.success && Array.isArray(response.data) ? response.data : [];

  // Filter for rejected events only
  const rejectedEvents = allEvents.filter(
    (event: any) => event.publishedStatus === 'REJECTED' && !event.isCancelled
  );

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rejected Events</h1>
            <p className="text-muted-foreground">
              Review previously rejected events. You can move them back to
              pending review or publish them directly after necessary
              corrections.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {rejectedEvents.length} Rejected
            </div>
          </div>
        </div>

        <RejectedEventsTable
          initialData={rejectedEvents ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
