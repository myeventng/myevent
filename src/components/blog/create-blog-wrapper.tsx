'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BlogForm } from './blog-form';
import { createBlog } from '@/actions/blog-actions';
import { BlogStatus } from '@/generated/prisma';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

interface CreateBlogWrapperProps {
  categories: Array<{ id: string; name: string; color: string }>;
  canPublish?: boolean;
}

export function CreateBlogWrapper({
  categories,
  canPublish = false,
}: CreateBlogWrapperProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const result = await createBlog(data);
      if (result.success) {
        toast.success('Blog post created successfully!');
        router.push('/admin/dashboard/blogs');
      } else {
        toast.error(
          result.message || 'Failed to create blog post. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('An error occurred while creating the blog post.');
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
