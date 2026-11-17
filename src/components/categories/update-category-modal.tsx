'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { updateCategory } from '@/actions/category-actions';
import type { CategoryRow, MajorOption } from './types';
import { toast } from 'sonner';

// Form validation schema
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  majorCategoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryRow;
  onCategoryUpdated: (category: CategoryRow) => void;
  majorCategories: MajorOption[];
}

export const UpdateCategoryModal = ({
  isOpen,
  onClose,
  category,
  onCategoryUpdated,
  majorCategories,
}: UpdateCategoryModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      majorCategoryId: category.majorCategoryId ?? '',
    },
  });

  // Update form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        id: category.id,
        name: category.name,
        majorCategoryId: category.majorCategoryId ?? '',
      });
    }
  }, [category, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await updateCategory({
        id: values.id,
        name: values.name,
        majorCategoryId: values.majorCategoryId || null,
      });

      if (response.success && response.data) {
        toast.success('Category updated successfully');
        onCategoryUpdated(response.data);
        onClose();
      } else {
        toast.error(response.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the details of {category.name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register('id')} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="majorCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not under a major category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {majorCategories.map((major) => (
                        <SelectItem key={major.id} value={major.id}>
                          {major.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Category
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
