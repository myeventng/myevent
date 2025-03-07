import { CityForm } from '@/components/forms/CityForm';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export default async function AddCityPage() {
  // Check if user is admin
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    redirect('/admin');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New City</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <CityForm />
      </div>
    </div>
  );
}
