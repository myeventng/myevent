import { DashboardLayout } from '@/components/layout/dashboard-layout';
// import { prisma } from '@/lib/prisma';
// import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { BlogTable } from '@/components/blog/blog-table';
import { getBlogs, getBlogCategories } from '@/actions/blog-actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function BlogsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);

  const [blogsResponse, categoriesResponse] = await Promise.all([
    getBlogs(1, 50), // Get first 50 blogs
    getBlogCategories(),
  ]);

  const blogs = blogsResponse.success ? blogsResponse.data.blogs : [];
  const categories = categoriesResponse.success ? categoriesResponse.data : [];
  console.log(categories);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Blog Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Create, edit, and manage your blog content. Share insights and
              engage with your event community.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
              {session.user.subRole}
            </Badge>

            <Link href="/admin/dashboard/blogs/create">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Blog Post
              </Button>
            </Link>
          </div>
        </div>

        {/* Remove onEdit prop - navigation is handled internally now */}
        <BlogTable
          initialData={blogs ?? []}
          userCanEdit={true}
          userIsSuperAdmin={isUserSuperAdmin}
        />
      </div>
    </DashboardLayout>
  );
}
