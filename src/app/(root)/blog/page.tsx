import { getPublishedBlogs, getBlogCategories } from '@/actions/blog-actions';
import { BlogGrid } from '@/components/blog/blog-grid';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const metadata = {
  title: 'Event Insights & Tips | MyEvent.com.ng Blog',
  description:
    "Discover expert tips, industry trends, and actionable insights to make your events unforgettable. From planning to execution, we've got you covered.",
  keywords:
    'event planning, event management, event tips, event marketing, event industry trends',
};

export default async function BlogPage() {
  const [blogsResponse, categoriesResponse] = await Promise.all([
    getPublishedBlogs(1, 12),
    getBlogCategories(),
  ]);

  const blogs = blogsResponse.success ? blogsResponse.data.blogs : [];
  const pagination = blogsResponse.success
    ? blogsResponse.data.pagination
    : null;
  const categories: { id: string; name: string; color: string }[] =
    categoriesResponse.success && Array.isArray(categoriesResponse.data)
      ? categoriesResponse.data
      : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 ">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Event Industry Insights
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Event{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Insights
            </span>{' '}
            & Tips
          </h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover expert tips, industry trends, and actionable insights to
            make your events unforgettable. From planning to execution, we've
            got you covered.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search blog posts..."
              className="pl-12 h-12 text-lg border-2 border-white/50 bg-white/80 backdrop-blur-sm"
            />
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {blogs.length > 0 ? (
            <BlogGrid
              initialBlogs={blogs}
              initialPagination={pagination}
              categories={categories}
            />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No blog posts yet
              </h3>
              <p className="text-gray-600">
                Check back soon for exciting content!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
