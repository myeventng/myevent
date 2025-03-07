'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CategoryFormValues,
  createCategory,
  updateCategory,
} from '@/lib/actions/category.actions';
import { CategorySchema } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface CategoryFormProps {
  initialData?: {
    id: string;
    name: string;
  };
}

export const CategoryForm = ({ initialData }: CategoryFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? '',
        }
      : {
          name: '',
        },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    setLoading(true);
    try {
      if (initialData) {
        const result = await updateCategory(initialData.id, data);
        if ('error' in result) {
          console.error('Update error:', result.error);
          toast.error(result.error);
          return;
        }
        toast.success('Category updated successfully');
        router.push('/admin/categories');
      } else {
        const result = await createCategory(data);
        if ('error' in result) {
          // console.error('Create error:', result.error);
          toast.error(result.error);
          return;
        }
        toast.success('Category created successfully');
        router.push('/admin/categories');
      }
      router.refresh();
    } catch (error: any) {
      // console.error('Submission error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? 'Processing...'
            : initialData
            ? 'Update Category'
            : 'Create Category'}
        </Button>
      </form>
    </Form>
  );
};
