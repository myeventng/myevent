import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';

export default async function AddVenuePage() {
  // Check if user is admin or organizer
  const role = await currentRole();

  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    redirect('/admin');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Event</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <EventForm />
      </div>
    </div>
  );
}
