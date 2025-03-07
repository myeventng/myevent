import { getCity } from '@/lib/actions/city.actions';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { CityForm } from '@/components/forms/CityForm';
import { redirect } from 'next/navigation';

interface EditCityPageProps {
  params: {
    id: string;
  };
}

export default async function EditCityPage({ params }: EditCityPageProps) {
  // Check if user is admin
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    redirect('/admin');
  }

  const city = await getCity(params.id);

  if (!city) {
    redirect('/admin/cities');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit City</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <CityForm initialData={city} />
      </div>
    </div>
  );
}
