import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateBlogWrapper } from '@/components/blog/create-blog-wrapper';
import { getServerSideAuth } from '@/lib/auth-utils';
import { getBlogCategories } from '@/actions/blog-actions';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/client-auth-utils';

export default async function CreateBlogPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  const categoriesResponse = await getBlogCategories();
  const categories: { id: string; name: string; color: string }[] =
    categoriesResponse &&
    categoriesResponse.success &&
    Array.isArray(categoriesResponse.data)
      ? categoriesResponse.data
      : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Blog Post
            </h1>
            <p className="text-muted-foreground mt-2">
              Share your insights and expertise with the event community. Create
              engaging content that helps others succeed.
            </p>
          </div>
          <Badge
            variant={isUserSuperAdmin ? 'destructive' : 'secondary'}
            className="w-fit"
          >
            {session.user.subRole}
          </Badge>
        </div>

        <CreateBlogWrapper
          categories={categories}
          canPublish={isUserSuperAdmin}
        />
      </div>
    </DashboardLayout>
  );
}
