import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateEventForm } from '@/components/events/create-event-form';
import { getServerSideAuth } from '@/lib/auth-utils';

export default async function AdminCreateEvent() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground">
            Create and configure your event with our step-by-step process.
          </p>
        </div>

        <CreateEventForm
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
