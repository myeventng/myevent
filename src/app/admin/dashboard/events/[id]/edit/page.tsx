import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EditEventForm } from '@/components/events/edit-event-form';
import { getEventById } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-utils';

interface AdminEditEventPageProps {
  params: {
    id: string;
  };
}

export default async function AdminEditEventPage({
  params,
}: AdminEditEventPageProps) {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  // Fetch the event
  const response = await getEventById(params.id);

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
