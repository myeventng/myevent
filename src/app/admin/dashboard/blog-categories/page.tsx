import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { BlogCategoryTable } from '@/components/blog/blog-category-table';
import { getBlogCategories } from '@/actions/blog-actions';

export default async function BlogCategories() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  const response = await getBlogCategories();
  const categories = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Blog Categories
            </h1>
            <p className="text-muted-foreground mt-2">
              Organize your blog content with custom categories. Create, edit,
              and manage categories for better content organization.
            </p>
          </div>
          <Badge
            variant={isUserSuperAdmin ? 'destructive' : 'secondary'}
            className="w-fit"
          >
            {session.user.subRole}
          </Badge>
        </div>

        <BlogCategoryTable
          initialData={categories ?? []}
          userCanCreate={isUserSuperAdmin || session.user.subRole === 'STAFF'}
        />
      </div>
    </DashboardLayout>
  );
}
