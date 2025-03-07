import { getCategory } from '@/lib/actions/category.actions';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { redirect } from 'next/navigation';

interface EditCategoryPageProps {
  params: {
    id: string;
  };
}

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  // Check if user is admin
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    redirect('/admin');
  }

  const category = await getCategory(params.id);

  if (!category) {
    redirect('/admin/categories');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Category</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <CategoryForm initialData={category} />
      </div>
    </div>
  );
}
