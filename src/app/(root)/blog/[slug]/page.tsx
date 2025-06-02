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

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const response = await getBlogBySlug(params.slug);

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
  const response = await getBlogBySlug(params.slug);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/blog">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Featured Image */}
            {blog.featuredImage && (
              <div className="relative h-96 overflow-hidden">
                <Image
                  fill
                  src={blog.featuredImage}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Category Badge */}
                <div
                  className="absolute top-6 left-6 px-4 py-2 rounded-full text-white font-semibold shadow-lg"
                  style={{ backgroundColor: blog.category.color }}
                >
                  {blog.category.name}
                </div>

                {/* Share Button */}
                <Button
                  size="icon"
                  className="absolute top-6 right-6 bg-white/90 hover:bg-white text-gray-700"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="p-8">
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {blog.title}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8 pb-8 border-b">
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
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-500">
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
                className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: blog.content.replace(/\n/g, '<br />'),
                }}
              />
            </div>
          </article>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Related Posts
              </h2>
              <p className="text-gray-600">
                More insights from the {blog.category.name} category
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
