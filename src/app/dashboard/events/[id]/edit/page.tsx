import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EditEventForm } from '@/components/events/edit-event-form';
import { getEventById } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-utils';

interface OrganizerEditEventPageProps {
  params: {
    id: string;
  };
}

export default async function OrganizerEditEventPage({
  params,
}: OrganizerEditEventPageProps) {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
    subRoles: ['ORGANIZER', 'STAFF', 'SUPER_ADMIN'],
  });

  // Fetch the event
  const response = await getEventById(params.id);

  if (!response.success || !response.data) {
    notFound();
  }

  const event = response.data;

  // Check if the user owns this event (unless they're an admin)
  const isAdmin =
    session.user.role === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);

  if (!isAdmin && event.userId !== session.user.id) {
    notFound();
  }

  return (
    <DashboardLayout session={session}>
      <EditEventForm
        initialData={event}
        isEditing={true}
        userRole={session.user.role}
        userSubRole={session.user.subRole}
      />
    </DashboardLayout>
  );
}
