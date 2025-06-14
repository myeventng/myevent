// app/admin/dashboard/blogs/edit/[id]/page.tsx - FIXED VERSION

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EditBlogWrapper } from '@/components/blog/edit-blog-wrapper';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { getBlogCategories } from '@/actions/blog-actions';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

interface EditBlogPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getBlogById(id: string) {
  try {
    const blog = await prisma.blog.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
        author: {
          select: { id: true, name: true },
        },
      },
    });

    return blog;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  // Await params before using them
  const { id } = await params;

  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/unauthorized');
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch blog and categories
  const [blog, categoriesResponse] = await Promise.all([
    getBlogById(id),
    getBlogCategories(),
  ]);

  if (!blog) {
    notFound();
  }

  // Check if user can edit this blog
  if (blog.authorId !== session.user.id && !isUserSuperAdmin) {
    return (
      <DashboardLayout session={session}>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You can only edit your own blog posts.
          </p>
        </div>
      </DashboardLayout>
    );
  }

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
              Edit Blog Post
            </h1>
            <p className="text-muted-foreground mt-2">
              Update your blog content and make improvements to engage your
              audience better.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={isUserSuperAdmin ? 'destructive' : 'secondary'}
              className="w-fit"
            >
              {session.user.subRole}
            </Badge>
            <Badge variant="outline">
              Status: {blog.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <EditBlogWrapper
          blog={{
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.excerpt ?? undefined,
            content: blog.content,
            featuredImage: blog.featuredImage ?? undefined,
            metaTitle: blog.metaTitle ?? undefined,
            metaDescription: blog.metaDescription ?? undefined,
            tags: blog.tags,
            categoryId: blog.categoryId,
            featured: blog.featured,
            status: blog.status,
          }}
          categories={categories}
          canPublish={isUserSuperAdmin}
        />
      </div>
    </DashboardLayout>
  );
}

// Generate metadata for the page - FIXED VERSION
export async function generateMetadata({ params }: EditBlogPageProps) {
  // Await params before using them
  const { id } = await params;
  const blog = await getBlogById(id);

  return {
    title: blog ? `Edit: ${blog.title}` : 'Edit Blog Post',
  };
}
