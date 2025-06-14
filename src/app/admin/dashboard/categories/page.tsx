import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { CategoriesTable } from '@/components/categories/categories-table';
import { getCategories } from '@/actions/category-actions';
import { redirect } from 'next/navigation';

export default async function Categories() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });
  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }
  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch categories from database
  const response = await getCategories();
  const categories = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Manage categories in your application. You can add, edit, or
              delete categories as needed.
            </p>
          </div>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        <CategoriesTable
          initialData={categories ?? []}
          userCanCreate={isUserSuperAdmin || session.user.subRole === 'STAFF'}
        />
      </div>
    </DashboardLayout>
  );
}
