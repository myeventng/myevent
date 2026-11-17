import { getPublishedBlogs, getBlogCategories } from '@/actions/blog-actions';
import { BlogGrid } from '@/components/blog/blog-grid';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { Search } from 'lucide-react';

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
    <div className="min-h-screen bg-[var(--me-bg)]">
      <section className="relative overflow-hidden py-14 sm:py-20">
        <EventBackdrop variant="hero" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Event tips and news
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--me-muted)]">
            Advice for hosts and guests, plus what is happening in the Nigerian
            events scene.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden pb-20">
        <EventBackdrop variant="section" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {blogs.length > 0 ? (
            <BlogGrid
              initialBlogs={blogs}
              initialPagination={pagination}
              categories={categories}
            />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-[var(--me-line)] px-6 py-16 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-[var(--me-violet)]" aria-hidden="true" />
              <h3 className="font-display text-2xl font-bold">No articles yet</h3>
              <p className="mt-2 text-[var(--me-muted)]">
                New posts are on the way. Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
