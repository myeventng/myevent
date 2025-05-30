// components/blog/edit-blog-wrapper.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BlogForm } from './blog-form';
import { updateBlog } from '@/actions/blog-actions';
import { BlogStatus } from '@/generated/prisma';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BlogData {
  id: string;
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

interface EditBlogWrapperProps {
  blog: BlogData;
  categories: Array<{ id: string; name: string; color: string }>;
  canPublish?: boolean;
}

export function EditBlogWrapper({
  blog,
  categories,
  canPublish = false,
}: EditBlogWrapperProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const result = await updateBlog(blog.id, data);
      if (result.success) {
        // Show success message (you can replace with toast)
        alert('Blog post updated successfully!');
        router.push('/admin/dashboard/blogs');
      } else {
        alert(result.message || 'Failed to update blog post');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('Failed to update blog post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        'Are you sure you want to cancel? Any unsaved changes will be lost.'
      )
    ) {
      router.push('/admin/dashboard/blogs');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Back Button */}
      <div className="border-b p-6">
        <Link href="/admin/dashboard/blogs">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog Management
          </Button>
        </Link>
      </div>

      {/* Form */}
      <div className="p-6">
        <BlogForm
          initialData={{
            title: blog.title,
            slug: blog.slug,
            excerpt: blog.excerpt,
            content: blog.content,
            featuredImage: blog.featuredImage,
            metaTitle: blog.metaTitle,
            metaDescription: blog.metaDescription,
            tags: blog.tags,
            categoryId: blog.categoryId,
            featured: blog.featured,
            status: blog.status,
          }}
          categories={categories}
          onSubmit={handleSubmit}
          loading={loading}
          onCancel={handleCancel}
          canPublish={canPublish}
        />
      </div>
    </div>
  );
}
