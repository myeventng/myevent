import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EditEventForm } from '@/components/events/edit-event-form';
import { getEventById } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';

interface AdminEditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEditEventPage({
  params,
}: AdminEditEventPageProps) {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    notFound(); // Redirect to unauthorized page if no session
  }

  // Fetch the event
  const { id } = await params;
  const response = await getEventById(id);

  if (!response.success || !response.data) {
    notFound();
  }

  const event = response.data;

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
