'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BlogCategoryForm } from './blog-category-form';
import {
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '@/actions/blog-actions';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  _count: {
    blogs: number;
  };
}

interface BlogCategoryTableProps {
  initialData: BlogCategory[];
  userCanCreate: boolean;
}

export function BlogCategoryTable({
  initialData,
  userCanCreate,
}: BlogCategoryTableProps) {
  const [categories, setCategories] = useState<BlogCategory[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (data: any) => {
    setLoading(true);
    try {
      const result = await createBlogCategory(data);
      if (result.success) {
        setCategories((prev) => [
          ...prev,
          { ...result.data, _count: { blogs: 0 } },
        ]);
        setIsCreateOpen(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingCategory) return;

    setLoading(true);
    try {
      const result = await updateBlogCategory(editingCategory.id, data);
      if (result.success) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === editingCategory.id
              ? { ...result.data, _count: cat._count }
              : cat
          )
        );
        setEditingCategory(null);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    setLoading(true);
    try {
      const result = await deleteBlogCategory(id);
      if (result.success) {
        setCategories((prev) => prev.filter((cat) => cat.id !== id));
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-80"
          />
        </div>

        {userCanCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Blog Category</DialogTitle>
              </DialogHeader>
              <BlogCategoryForm
                onSubmit={handleCreate}
                loading={loading}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {category.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600">
                    {category.description || 'No description'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {category._count.blogs} posts
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {userCanCreate && (
                      <>
                        <Dialog
                          open={editingCategory?.id === category.id}
                          onOpenChange={(open) =>
                            !open && setEditingCategory(null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCategory(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Blog Category</DialogTitle>
                            </DialogHeader>
                            <BlogCategoryForm
                              initialData={editingCategory || undefined}
                              onSubmit={handleUpdate}
                              loading={loading}
                              onCancel={() => setEditingCategory(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(category.id)}
                          disabled={category._count.blogs > 0}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
