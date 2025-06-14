import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminEventsTable } from '@/components/admin/admin-events-table';
import { getEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminEvents() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Fetch all events (published and unpublished for admin view)
  const response = await getEvents(false); // false to get all events
  const events = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Events Management</h1>
            <p className="text-muted-foreground">
              Manage all events in the system. You can publish, feature, and
              moderate events.
            </p>
          </div>
        </div>

        <AdminEventsTable
          initialData={events ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
