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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { updateTag } from '@/actions/tag.actions';
import { Tag } from '@/generated/prisma';
import { toast } from 'sonner';

// Form validation schema
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Tag name must be at least 2 characters'),
  bgColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color'),
  slug: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag;
  onTagUpdated: (tag: Tag) => void;
}

// Predefined color options
const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
];

export const UpdateTagModal = ({
  isOpen,
  onClose,
  tag,
  onTagUpdated,
}: UpdateTagModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: tag.id,
      name: tag.name,
      bgColor: tag.bgColor,
      slug: tag.slug || '',
    },
  });

  // Update form when tag changes
  useEffect(() => {
    if (tag) {
      form.reset({
        id: tag.id,
        name: tag.name,
        bgColor: tag.bgColor,
        slug: tag.slug || '',
      });
    }
  }, [tag, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await updateTag(values);

      if (response.success && response.data) {
        toast.success('Tag updated successfully');
        onTagUpdated(response.data);
        onClose();
      } else {
        toast.error(response.message || 'Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Watch name field to auto-generate slug
  const watchedName = form.watch('name');
  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    // Only auto-generate slug if it's empty or matches the previous auto-generated slug
    const currentSlug = form.getValues('slug');
    const expectedSlug = generateSlug(tag.name);
    if (!currentSlug || currentSlug === expectedSlug) {
      form.setValue('slug', generateSlug(value));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
          <DialogDescription>Update the tag details below.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register('id')} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter tag name"
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for this tag.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bgColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Color</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input type="color" className="h-10 w-20" {...field} />
                      <div className="grid grid-cols-6 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Selected: {field.value}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Choose a color for the tag background.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="auto-generated-slug" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL-friendly version of the tag name. Leave empty to
                    auto-generate.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {watchedName && (
              <div className="space-y-2">
                <FormLabel>Preview</FormLabel>
                <div
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: form.watch('bgColor') }}
                >
                  {watchedName}
                </div>
              </div>
            )}

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
                Update Tag
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
