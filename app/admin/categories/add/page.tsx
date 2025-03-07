import { CategoryForm } from '@/components/forms/CategoryForm';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

export default async function AddCategoryPage() {
  // Check if user is admin
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    redirect('/admin');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Category</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <CategoryForm />
      </div>
    </div>
  );
}
