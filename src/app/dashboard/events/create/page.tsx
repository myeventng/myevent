// src/app/dashboard/events/create/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateEventForm } from '@/components/events/create-event-form';
import { OrganizerProfileRequired } from '@/components/organizer/organizer-profile-required';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function CreateEvent() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow users and admins
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground">
            Create and configure your event with our step-by-step process.
          </p>
        </div>

        <OrganizerProfileRequired redirectUrl="/dashboard/events">
          <CreateEventForm
            userRole={session.user.role}
            userSubRole={session.user.subRole}
          />
        </OrganizerProfileRequired>
      </div>
    </DashboardLayout>
  );
}
