import { getBlogBySlug, getPublishedBlogs } from '@/actions/blog-actions';
import {
  Calendar,
  Clock,
  Eye,
  User,
  Tag,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlogCard } from '@/components/blog/blog-card';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';

// Updated interface to match Next.js App Router expectations
interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  // Await the params before using them
  const { slug } = await params;
  const response = await getBlogBySlug(slug);

  if (!response.success) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  const blog = response.data;

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.excerpt,
    keywords: blog.tags.join(', '),
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: blog.excerpt,
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  // Await the params before using them
  const { slug } = await params;
  const response = await getBlogBySlug(slug);

  if (!response.success) {
    notFound();
  }

  const blog = response.data;

  // Get related posts from same category
  const relatedResponse = await getPublishedBlogs(1, 3, blog.categoryId);

  interface RelatedPost {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    featuredImage?: string;
    views: number;
    readingTime?: number;
    publishedAt?: string;
    featured: boolean;
    author: {
      id: string;
      name: string;
      [key: string]: any;
    };
    category: {
      id: string;
      name: string;
      color?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface RelatedResponse {
    success: boolean;
    data: {
      blogs: RelatedPost[];
    };
  }

  const relatedPosts: RelatedPost[] = (relatedResponse as RelatedResponse)
    .success
    ? (relatedResponse as RelatedResponse).data.blogs
        .filter((post: RelatedPost) => post.id !== blog.id)
        .slice(0, 3)
    : [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[var(--me-bg)]">
      {/* Back Button */}
      <div className="border-b-2 border-[var(--me-line)] bg-[var(--me-bg-deep)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/blog">
            <Button variant="ghost" className="gap-2 rounded-full text-white hover:bg-[var(--me-raised)] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              All articles
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <article className="rounded-2xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] overflow-hidden shadow-[8px_8px_0_0_var(--me-violet)]">
            {/* Featured Image */}
            {blog.featuredImage && (
              <div className="relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:h-96">
                <Image
                  fill
                  src={blog.featuredImage}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />

                {/* Category Badge */}
                <div
                  className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[var(--me-bg-deep)] px-4 py-2 text-sm font-semibold text-white sm:left-6 sm:top-6"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: blog.category.color }} aria-hidden="true" />
                  {blog.category.name}
                </div>

                {/* Share Button */}
                <Button
                  size="icon"
                  aria-label="Share" className="absolute right-4 top-4 rounded-full bg-[var(--me-red)] text-white hover:bg-[var(--me-red)] sm:right-6 sm:top-6"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="p-5 sm:p-8">
              {/* Title */}
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white mb-6 sm:text-5xl">
                {blog.title}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-6 text-[var(--me-muted)] mb-8 pb-8 border-b-2 border-[var(--me-line)]">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{blog.author.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                </div>

                {blog.readingTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{blog.readingTime} min read</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span>{blog.views.toLocaleString()} views</span>
                </div>
              </div>

              {/* Tags */}
              {blog.tags.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-[var(--me-muted)]" />
                    <span className="text-sm font-medium text-[var(--me-muted)]">
                      Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div
                className="prose prose-lg prose-invert max-w-none prose-headings:font-display prose-headings:text-white prose-p:text-[var(--me-muted)] prose-p:leading-relaxed prose-a:text-[var(--me-violet)] prose-strong:text-white"
                dangerouslySetInnerHTML={{
                  __html: blog.content.replace(/\n/g, '<br />'),
                }}
              />
            </div>
          </article>
        </div>
      </section>

      {/* Keep reading */}
      {relatedPosts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-extrabold text-white mb-2">
                Keep reading
              </h2>
              <p className="text-[var(--me-muted)]">
                More insights from the {blog.category.name} category
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  blog={{
                    ...post,
                    category: {
                      ...post.category,
                      color: post.category.color ?? '#000000', // Provide a default color if undefined
                    },
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
