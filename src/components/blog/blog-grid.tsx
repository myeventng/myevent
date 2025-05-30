'use client';

import { useState, useEffect, useCallback } from 'react';
import { BlogCard } from './blog-card';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPublishedBlogs } from '@/actions/blog-actions';

interface BlogGridProps {
  initialBlogs: any[];
  initialPagination: any;
  categories: Array<{ id: string; name: string; color: string }>;
}

export function BlogGrid({
  initialBlogs,
  initialPagination,
  categories,
}: BlogGridProps) {
  const [blogs, setBlogs] = useState(initialBlogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadMore = useCallback(async () => {
    if (loading || pagination.page >= pagination.totalPages) return;

    setLoading(true);
    try {
      const result = await getPublishedBlogs(
        pagination.page + 1,
        10,
        categoryFilter === 'all' ? undefined : categoryFilter
      );

      if (result.success) {
        setBlogs((prev) => [...prev, ...result.data.blogs]);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load more blogs:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, pagination, categoryFilter]);

  const handleCategoryChange = async (newCategory: string) => {
    setCategoryFilter(newCategory);
    setLoading(true);

    try {
      const result = await getPublishedBlogs(
        1,
        10,
        newCategory === 'all' ? undefined : newCategory
      );

      if (result.success) {
        setBlogs(result.data.blogs);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('Failed to filter blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return (
    <div className="space-y-8">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogs.map((blog, index) => (
          <BlogCard
            key={blog.id}
            blog={blog}
            size={index === 0 ? 'featured' : 'default'}
          />
        ))}
      </div>

      {/* Loading / Load More */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {pagination.page < pagination.totalPages && !loading && (
        <div className="flex justify-center py-8">
          <Button
            onClick={loadMore}
            variant="outline"
            size="lg"
            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
          >
            Load More Posts
          </Button>
        </div>
      )}

      {blogs.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">No blog posts found</p>
          <p className="text-gray-400 mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
