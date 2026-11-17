'use client';

import { Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface BlogCardProps {
  blog: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    featuredImage?: string;
    views?: number;
    readingTime?: number;
    publishedAt?: string;
    featured?: boolean;
    author: {
      name: string;
    };
    category: {
      name: string;
      color: string;
    };
  };
  size?: 'default' | 'featured' | 'compact';
}

export function BlogCard({ blog, size = 'default' }: BlogCardProps) {
  const date = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="me-card group flex h-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--me-raised)]">
        {blog.featuredImage && (
          <Image
            src={blog.featuredImage}
            alt=""
            fill
            sizes="(max-width: 1024px) 72vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-[var(--me-bg-deep)] px-3 py-1 text-xs font-semibold text-white">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: blog.category.color }}
            aria-hidden="true"
          />
          {blog.category.name}
        </span>
        {blog.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--me-red)] px-3 py-1 text-xs font-bold text-white">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--me-muted)]">
          {date && <span>{date}</span>}
          {blog.readingTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {blog.readingTime} min read
            </span>
          )}
        </div>

        <h3
          className={`font-display line-clamp-2 font-bold leading-snug text-white ${
            size === 'featured' ? 'text-2xl' : 'text-xl'
          }`}
        >
          {blog.title}
        </h3>

        {blog.excerpt && size !== 'compact' && (
          <p className="line-clamp-3 text-[15px] leading-relaxed text-[var(--me-muted)]">
            {blog.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 text-sm">
          <span className="text-[var(--me-muted)]">By {blog.author.name}</span>
          <span className="inline-flex items-center gap-1 font-bold text-white">
            Read
            <ArrowRight className="h-4 w-4 text-[var(--me-red)] transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
