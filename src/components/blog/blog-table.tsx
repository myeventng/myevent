'use client';

import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BlogStatus } from '@/generated/prisma';
import { updateBlogStatus, deleteBlog } from '@/actions/blog-actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Blog {
  id: string;
  title: string;
  slug: string;
  status: BlogStatus;
  featured: boolean;
  views: number;
  readingTime?: number;
  publishedAt?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
  };
}

interface BlogTableProps {
  initialData: Blog[];
  userCanEdit: boolean;
  userIsSuperAdmin: boolean;
}

const statusConfig = {
  [BlogStatus.DRAFT]: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  [BlogStatus.PENDING_REVIEW]: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  [BlogStatus.PUBLISHED]: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  [BlogStatus.REJECTED]: { color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function BlogTable({
  initialData,
  userCanEdit,
  userIsSuperAdmin,
}: BlogTableProps) {
  const [blogs, setBlogs] = useState<Blog[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEdit = (blog: Blog) => {
    router.push(`/admin/dashboard/blogs/edit/${blog.id}`);
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || blog.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (blogId: string, newStatus: BlogStatus) => {
    setLoading(true);
    try {
      const result = await updateBlogStatus(blogId, newStatus);
      if (result.success) {
        setBlogs((prev) =>
          prev.map((blog) =>
            blog.id === blogId
              ? {
                  ...blog,
                  status: newStatus,
                  publishedAt: result.data.publishedAt,
                }
              : blog
          )
        );
      } else {
        toast.error(result.message || 'Failed to update blog status');
      }
    } catch (error) {
      toast.error('Failed to update blog status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    setLoading(true);
    try {
      const result = await deleteBlog(blogId);
      if (result.success) {
        setBlogs((prev) => prev.filter((blog) => blog.id !== blogId));
      } else {
        toast.error(result.message || 'Failed to delete blog post');
      }
    } catch (error) {
      toast.error('Failed to delete blog post');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search blogs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={BlogStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={BlogStatus.PENDING_REVIEW}>
              Pending Review
            </SelectItem>
            <SelectItem value={BlogStatus.PUBLISHED}>Published</SelectItem>
            <SelectItem value={BlogStatus.REJECTED}>Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBlogs.map((blog) => {
              const StatusIcon = statusConfig[blog.status].icon;
              return (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{blog.title}</div>
                      <div className="text-sm text-gray-500">
                        /blog/{blog.slug}
                        {blog.featured && (
                          <Badge variant="secondary" className="ml-2">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: blog.category.color }}
                      />
                      {blog.category.name}
                    </div>
                  </TableCell>
                  <TableCell>{blog.author.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      <Badge className={statusConfig[blog.status].color}>
                        {blog.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      {blog.views.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {formatDate(blog.publishedAt || blog.createdAt)}
                      </div>
                      {blog.readingTime && (
                        <div className="text-gray-500">
                          {blog.readingTime} min read
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {userCanEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(blog)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {userIsSuperAdmin && (
                        <Select
                          value={blog.status}
                          onValueChange={(value) =>
                            handleStatusChange(blog.id, value as BlogStatus)
                          }
                          disabled={loading}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={BlogStatus.DRAFT}>
                              Draft
                            </SelectItem>
                            <SelectItem value={BlogStatus.PENDING_REVIEW}>
                              Pending
                            </SelectItem>
                            <SelectItem value={BlogStatus.PUBLISHED}>
                              Publish
                            </SelectItem>
                            <SelectItem value={BlogStatus.REJECTED}>
                              Reject
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {userCanEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(blog.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No blog posts found</p>
            {searchTerm || statusFilter !== 'all' ? (
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your search or filter criteria
              </p>
            ) : (
              <div className="mt-4">
                <Button
                  onClick={() => router.push('/admin/dashboard/blogs/create')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Blog Post
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
