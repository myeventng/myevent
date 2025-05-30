'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { BlogStatus } from '@/generated/prisma';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface BlogInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags: string[];
  categoryId: string;
  featured?: boolean;
  status?: BlogStatus;
}

interface BlogCategoryInput {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

// Generate slug from title
export async function generateSlug(title: string): Promise<string> {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Calculate reading time
export async function calculateReadingTime(content: string): Promise<number> {
  const wordsPerMinute = 200;
  const words = content.split(' ').length;
  return Promise.resolve(Math.ceil(words / wordsPerMinute));
}

// Validate user permissions
const validateUserPermission = async (requireSuperAdmin = false) => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  const { role, subRole } = session.user;

  if (role !== 'ADMIN') {
    return {
      success: false,
      message: 'You do not have permission to perform this action',
    };
  }

  if (requireSuperAdmin && subRole !== 'SUPER_ADMIN') {
    return {
      success: false,
      message: 'Only Super Admins can perform this action',
    };
  }

  if (!['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: false,
      message: 'You do not have permission to perform this action',
    };
  }

  return {
    success: true,
    user: session.user,
  };
};

// ===== BLOG CATEGORY ACTIONS (Separate from Event Categories) =====

export async function getBlogCategories(): Promise<ActionResponse<any[]>> {
  try {
    const categories = await prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return {
      success: false,
      message: 'Failed to fetch blog categories',
    };
  }
}

export async function getBlogCategoryBySlug(
  slug: string
): Promise<ActionResponse<any>> {
  try {
    const category = await prisma.blogCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: 'Blog category not found',
      };
    }

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error('Error fetching blog category:', error);
    return {
      success: false,
      message: 'Failed to fetch blog category',
    };
  }
}

export async function createBlogCategory(
  data: BlogCategoryInput
): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if blog category already exists
    const existingCategory = await prisma.blogCategory.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: 'insensitive' } },
          { slug: data.slug },
        ],
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message: `A blog category with this name or slug already exists`,
      };
    }

    const newCategory = await prisma.blogCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        color: data.color || '#3B82F6',
      },
    });

    revalidatePath('/admin/dashboard/blog-categories');

    return {
      success: true,
      message: 'Blog category created successfully',
      data: newCategory,
    };
  } catch (error) {
    console.error('Error creating blog category:', error);
    return {
      success: false,
      message: 'Failed to create blog category',
    };
  }
}

export async function updateBlogCategory(
  id: string,
  data: BlogCategoryInput
): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    const existingCategory = await prisma.blogCategory.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: 'Blog category not found',
      };
    }

    // Check for duplicate name/slug (exclude current category)
    const duplicate = await prisma.blogCategory.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: 'insensitive' } },
          { slug: data.slug },
        ],
        id: { not: id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: `A blog category with this name or slug already exists`,
      };
    }

    const updatedCategory = await prisma.blogCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        color: data.color || existingCategory.color,
      },
    });

    revalidatePath('/admin/dashboard/blog-categories');

    return {
      success: true,
      message: 'Blog category updated successfully',
      data: updatedCategory,
    };
  } catch (error) {
    console.error('Error updating blog category:', error);
    return {
      success: false,
      message: 'Failed to update blog category',
    };
  }
}

export async function deleteBlogCategory(
  id: string
): Promise<ActionResponse<null>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    const category = await prisma.blogCategory.findUnique({
      where: { id },
      include: {
        blogs: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: 'Blog category not found',
      };
    }

    if (category.blogs.length > 0) {
      return {
        success: false,
        message: 'Cannot delete category because it has associated blog posts',
      };
    }

    await prisma.blogCategory.delete({
      where: { id },
    });

    revalidatePath('/admin/dashboard/blog-categories');

    return {
      success: true,
      message: 'Blog category deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting blog category:', error);
    return {
      success: false,
      message: 'Failed to delete blog category',
    };
  }
}

// ===== BLOG ACTIONS =====

export async function getBlogs(
  page = 1,
  limit = 10,
  status?: BlogStatus,
  authorId?: string
): Promise<ActionResponse<any>> {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (authorId) where.authorId = authorId;

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true, color: true, slug: true },
          },
        },
      }),
      prisma.blog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        blogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return {
      success: false,
      message: 'Failed to fetch blogs',
    };
  }
}

export async function getPublishedBlogs(
  page = 1,
  limit = 10,
  categoryId?: string
): Promise<ActionResponse<any>> {
  try {
    const skip = (page - 1) * limit;

    const where: any = {
      status: BlogStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
    };
    if (categoryId) where.categoryId = categoryId;

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true },
          },
          category: {
            select: { id: true, name: true, color: true, slug: true },
          },
        },
      }),
      prisma.blog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        blogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error fetching published blogs:', error);
    return {
      success: false,
      message: 'Failed to fetch published blogs',
    };
  }
}

export async function getBlogBySlug(
  slug: string
): Promise<ActionResponse<any>> {
  try {
    const blog = await prisma.blog.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true, slug: true },
        },
      },
    });

    if (!blog) {
      return {
        success: false,
        message: 'Blog post not found',
      };
    }

    // Increment views
    await prisma.blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    });

    return {
      success: true,
      data: blog,
    };
  } catch (error) {
    console.error('Error fetching blog by slug:', error);
    return {
      success: false,
      message: 'Failed to fetch blog post',
    };
  }
}

export async function createBlog(
  data: BlogInput
): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if slug exists
    const existingBlog = await prisma.blog.findUnique({
      where: { slug: data.slug },
    });

    if (existingBlog) {
      return {
        success: false,
        message: 'A blog post with this slug already exists',
      };
    }

    const readingTime = await calculateReadingTime(data.content);
    const publishedAt =
      data.status === BlogStatus.PUBLISHED ? new Date() : null;

    if (!permissionCheck.user) {
      return {
        success: false,
        message: 'User information is missing from permission check',
      };
    }

    const newBlog = await prisma.blog.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        metaTitle: data.metaTitle || data.title,
        metaDescription: data.metaDescription || data.excerpt,
        tags: data.tags,
        readingTime,
        featured: data.featured || false,
        status: data.status || BlogStatus.DRAFT,
        publishedAt,
        authorId: permissionCheck.user.id,
        categoryId: data.categoryId,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    revalidatePath('/admin/dashboard/blogs');
    if (data.status === BlogStatus.PUBLISHED) {
      revalidatePath('/blog');
    }

    return {
      success: true,
      message: 'Blog post created successfully',
      data: newBlog,
    };
  } catch (error) {
    console.error('Error creating blog:', error);
    return {
      success: false,
      message: 'Failed to create blog post',
    };
  }
}

export async function updateBlog(
  id: string,
  data: BlogInput
): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    const existingBlog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!existingBlog) {
      return {
        success: false,
        message: 'Blog post not found',
      };
    }

    // Check if user can edit this blog
    if (
      !permissionCheck.user ||
      (existingBlog.authorId !== permissionCheck.user.id &&
        permissionCheck.user.subRole !== 'SUPER_ADMIN')
    ) {
      return {
        success: false,
        message: 'You can only edit your own blog posts',
      };
    }

    // Check slug uniqueness
    if (data.slug !== existingBlog.slug) {
      const slugExists = await prisma.blog.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        return {
          success: false,
          message: 'A blog post with this slug already exists',
        };
      }
    }

    const readingTime = await calculateReadingTime(data.content);
    const shouldUpdatePublishedAt =
      data.status === BlogStatus.PUBLISHED &&
      existingBlog.status !== BlogStatus.PUBLISHED;

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        metaTitle: data.metaTitle || data.title,
        metaDescription: data.metaDescription || data.excerpt,
        tags: data.tags,
        readingTime,
        featured: data.featured || false,
        status: data.status || existingBlog.status,
        publishedAt: shouldUpdatePublishedAt
          ? new Date()
          : existingBlog.publishedAt,
        categoryId: data.categoryId,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    revalidatePath('/admin/dashboard/blogs');
    revalidatePath('/blog');
    revalidatePath(`/blog/${data.slug}`);

    return {
      success: true,
      message: 'Blog post updated successfully',
      data: updatedBlog,
    };
  } catch (error) {
    console.error('Error updating blog:', error);
    return {
      success: false,
      message: 'Failed to update blog post',
    };
  }
}

export async function deleteBlog(id: string): Promise<ActionResponse<null>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    const blog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      return {
        success: false,
        message: 'Blog post not found',
      };
    }
    // Check if user can delete this blog
    if (
      !permissionCheck.user ||
      (blog.authorId !== permissionCheck.user.id &&
        permissionCheck.user.subRole !== 'SUPER_ADMIN')
    ) {
      return {
        success: false,
        message: 'You can only delete your own blog posts',
      };
    }

    await prisma.blog.delete({
      where: { id },
    });

    revalidatePath('/admin/dashboard/blogs');
    revalidatePath('/blog');

    return {
      success: true,
      message: 'Blog post deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting blog:', error);
    return {
      success: false,
      message: 'Failed to delete blog post',
    };
  }
}

export async function updateBlogStatus(
  id: string,
  status: BlogStatus
): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission(true); // Only super admin
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    const blog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      return {
        success: false,
        message: 'Blog post not found',
      };
    }

    const publishedAt =
      status === BlogStatus.PUBLISHED && blog.status !== BlogStatus.PUBLISHED
        ? new Date()
        : blog.publishedAt;

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        status,
        publishedAt,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    revalidatePath('/admin/dashboard/blogs');
    revalidatePath('/blog');

    return {
      success: true,
      message: `Blog post ${status.toLowerCase()} successfully`,
      data: updatedBlog,
    };
  } catch (error) {
    console.error('Error updating blog status:', error);
    return {
      success: false,
      message: 'Failed to update blog status',
    };
  }
}

//hompage blog post interface
// actions/blog-actions.ts - Add this function to your existing blog actions

export async function getLatestBlogPosts(
  limit = 6
): Promise<ActionResponse<BlogPost[]>> {
  try {
    const blogPostsRaw = await prisma.blog.findMany({
      where: {
        status: BlogStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true, color: true, slug: true },
        },
      },
    });

    // Map to ensure excerpt and featuredImage are always string
    const blogPosts: BlogPost[] = blogPostsRaw.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt ?? '',
      featuredImage: post.featuredImage ?? '',
      publishedAt: post.publishedAt?.toISOString?.() ?? '',
      author: {
        name: post.author.name,
      },
      category: {
        name: post.category.name,
        color: post.category.color,
        slug: post.category.slug,
      },
      slug: post.slug,
      readingTime: post.readingTime ?? undefined,
      views: post.views,
    }));

    return {
      success: true,
      data: blogPosts,
    };
  } catch (error) {
    console.error('Error fetching latest blog posts:', error);
    return {
      success: false,
      message: 'Failed to fetch latest blog posts',
    };
  }
}

// Add this interface at the top of your blog actions file if not already present
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  author: {
    name: string;
  };
  category: {
    name: string;
    color: string;
    slug: string;
  };
  slug: string;
  readingTime?: number;
  views: number;
}

// Mock newsletter subscription - replace with your actual implementation
export async function subscribeToNewsletter(
  email: string
): Promise<ActionResponse<null>> {
  try {
    // Add your newsletter subscription logic here
    // This could involve:
    // 1. Saving to database
    // 2. Integrating with email service (Mailchimp, ConvertKit, etc.)
    // 3. Sending confirmation email

    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address',
      };
    }

    // Here you would typically:
    // 1. Check if email already exists in your newsletter list
    // 2. Add email to your newsletter service
    // 3. Send confirmation email

    return {
      success: true,
      message: 'Successfully subscribed to our newsletter!',
    };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return {
      success: false,
      message: 'Failed to subscribe. Please try again.',
    };
  }
}
