'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateSlug } from '@/actions/blog-actions';

interface BlogCategoryFormProps {
  initialData?: {
    name: string;
    slug: string;
    description?: string;
    color: string;
  };
  onSubmit: (data: any) => void;
  loading: boolean;
  onCancel: () => void;
}

const colorOptions = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export function BlogCategoryForm({
  initialData,
  onSubmit,
  loading,
  onCancel,
}: BlogCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    color: initialData?.color || '#3B82F6',
  });

  // Auto-generate slug when name changes
  useEffect(() => {
    if (!initialData && formData.name) {
      (async () => {
        const slug = await generateSlug(formData.name);
        setFormData((prev) => ({
          ...prev,
          slug,
        }));
      })();
    }
  }, [formData.name, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter category name"
          required
        />
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, slug: e.target.value }))
          }
          placeholder="category-slug"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Brief description of this category"
          rows={3}
        />
      </div>

      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 ${
                formData.color === color ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
