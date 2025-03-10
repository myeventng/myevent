import { getEvent } from '@/lib/actions/event.actions';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';

interface EditEventPageProps {
  params: {
    id: string;
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  // Check if user is admin or organizer
  const role = await currentRole();

  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    redirect('/admin');
  }

  const event = await getEvent(params.id);

  if (!event) {
    redirect('/admin/events');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <EventForm in={event} />
      </div>
    </div>
  );
}
