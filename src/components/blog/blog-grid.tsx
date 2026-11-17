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
        <Filter className="h-5 w-5 text-[var(--me-violet)]" aria-hidden="true" />
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-64 rounded-full border-2 border-[var(--me-line)] bg-transparent text-white">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent className="me-theme">
            <SelectItem value="all">All categories</SelectItem>
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <Loader2 className="w-6 h-6 animate-spin text-[var(--me-red)]" />
        </div>
      )}

      {pagination.page < pagination.totalPages && !loading && (
        <div className="flex justify-center py-8">
          <Button
            onClick={loadMore}
            variant="outline"
            size="lg"
            className="rounded-full border-2 border-[var(--me-violet)] bg-transparent text-white hover:bg-[var(--me-violet)] hover:text-white"
          >
            Load more articles
          </Button>
        </div>
      )}

      {blogs.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="font-display text-2xl font-bold text-white">No articles found</p>
          <p className="mt-2 text-[var(--me-muted)]">Try a different category.</p>
        </div>
      )}
    </div>
  );
}
