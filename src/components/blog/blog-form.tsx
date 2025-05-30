'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Eye } from 'lucide-react';
import { generateSlug } from '@/actions/blog-actions';
import { BlogStatus } from '@/generated/prisma';
import { FileUploader } from '@/components/layout/file-uploader';

interface BlogFormProps {
  initialData?: {
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
  };
  categories: Array<{ id: string; name: string; color: string }>;
  onSubmit: (data: any) => void;
  loading: boolean;
  onCancel: () => void;
  canPublish?: boolean;
}

export function BlogForm({
  initialData,
  categories,
  onSubmit,
  loading,
  onCancel,
  canPublish = false,
}: BlogFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    featuredImage: initialData?.featuredImage || '',
    metaTitle: initialData?.metaTitle || '',
    metaDescription: initialData?.metaDescription || '',
    tags: initialData?.tags || [],
    categoryId: initialData?.categoryId || '',
    featured: initialData?.featured || false,
    status: initialData?.status || BlogStatus.DRAFT,
  });

  const [newTag, setNewTag] = useState('');
  const [showSEO, setShowSEO] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (!initialData && formData.title) {
      // generateSlug is async, so handle it properly
      (async () => {
        const slug = await generateSlug(formData.title);
        setFormData((prev) => ({
          ...prev,
          slug,
        }));
      })();
    }
  }, [formData.title, initialData]);

  // Auto-generate meta fields
  useEffect(() => {
    if (!showSEO) return;

    if (!formData.metaTitle && formData.title) {
      setFormData((prev) => ({ ...prev, metaTitle: formData.title }));
    }
    if (!formData.metaDescription && formData.excerpt) {
      setFormData((prev) => ({
        ...prev,
        metaDescription: formData.excerpt.slice(0, 155),
      }));
    }
  }, [formData.title, formData.excerpt, showSEO]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Handle featured image upload
  const handleFeaturedImageChange = (url: string | string[]) => {
    const imageUrl = Array.isArray(url) ? url[0] : url;
    setFormData((prev) => ({
      ...prev,
      featuredImage: imageUrl || '',
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Enter blog post title"
          required
          className="text-lg"
        />
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">URL Slug *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, slug: e.target.value }))
          }
          placeholder="url-friendly-slug"
          required
        />
        <p className="text-sm text-gray-500 mt-1">URL: /blog/{formData.slug}</p>
      </div>

      {/* Category */}
      <div>
        <Label>Category *</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, categoryId: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured Image with File Uploader */}
      <div>
        <Label>Featured Image</Label>
        <p className="text-sm text-gray-500 mb-3">
          Upload a featured image for your blog post. This will be displayed as
          the main image.
        </p>
        <div className="border rounded-lg p-4 bg-gray-50">
          <FileUploader
            onFieldChange={handleFeaturedImageChange}
            imageUrls={formData.featuredImage}
            setFiles={setFiles}
            maxFiles={1}
            disabled={loading}
            endpoint="blogImage"
            multipleImages={false}
          />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
          }
          placeholder="Brief description of the blog post (recommended for SEO)"
          rows={3}
        />
        <p className="text-sm text-gray-500 mt-1">
          {formData.excerpt.length}/300 characters
        </p>
      </div>

      {/* Content */}
      <div>
        <Label htmlFor="content">Content *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="Write your blog post content here... You can use Markdown formatting."
          rows={20}
          required
          className="font-mono text-sm"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-500">
            {formData.content.split(' ').length} words • ~
            {Math.ceil(formData.content.split(' ').length / 200)} min read
          </p>
          <div className="text-xs text-gray-400">
            Tip: Use ## for headings, **bold** for emphasis, and - for lists
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <p className="text-sm text-gray-500 mb-2">
          Add relevant tags to help readers find your content
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag (press Enter)"
            className="flex-1"
          />
          <Button type="button" onClick={addTag} size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Featured Toggle */}
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Switch
          id="featured"
          checked={formData.featured}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, featured: checked }))
          }
        />
        <div>
          <Label htmlFor="featured" className="font-medium">
            Featured post
          </Label>
          <p className="text-sm text-gray-600">
            Featured posts appear prominently on your blog homepage
          </p>
        </div>
      </div>

      {/* SEO Section */}
      <div className="border rounded-lg p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowSEO(!showSEO)}
          className="p-0 text-blue-600 hover:text-blue-700 font-medium"
        >
          {showSEO ? 'Hide' : 'Show'} SEO Options
        </Button>

        {showSEO && (
          <div className="mt-4 space-y-4 p-4 border rounded-lg bg-gray-50">
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    metaTitle: e.target.value,
                  }))
                }
                placeholder="SEO title (60 characters max)"
                maxLength={60}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.metaTitle.length}/60 characters
              </p>
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    metaDescription: e.target.value,
                  }))
                }
                placeholder="SEO description (155 characters max)"
                maxLength={155}
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.metaDescription.length}/155 characters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {canPublish && (
        <div>
          <Label>Publication Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, status: value as BlogStatus }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BlogStatus.DRAFT}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  Draft - Save for later
                </div>
              </SelectItem>
              <SelectItem value={BlogStatus.PENDING_REVIEW}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  Pending Review - Submit for approval
                </div>
              </SelectItem>
              <SelectItem value={BlogStatus.PUBLISHED}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  Published - Live on website
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-6 border-t bg-gray-50 p-6 rounded-lg">
        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {loading ? 'Saving...' : initialData ? 'Update Post' : 'Create Post'}
        </Button>

        {!initialData && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onSubmit({ ...formData, status: BlogStatus.PENDING_REVIEW });
            }}
            disabled={loading}
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
          >
            Save & Submit for Review
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>

        {formData.slug && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Preview Blog Post"
            className="ml-auto"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
