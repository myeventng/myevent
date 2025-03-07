import { getVenue } from '@/lib/actions/venue.actions';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { VenueForm } from '@/components/forms/VenueForm';

interface EditVenuePageProps {
  params: {
    id: string;
  };
}

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  // Check if user is admin or organizer
  const role = await currentRole();

  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    redirect('/admin');
  }

  const venue = await getVenue(params.id);

  if (!venue) {
    redirect('/admin/venues');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Venue</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <VenueForm initialData={venue} />
      </div>
    </div>
  );
}
