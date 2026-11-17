'use client';

import React from 'react';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { SectionHeading } from '@/components/brand/section-heading';
import { BlogCard } from '@/components/blog/blog-card';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  author: {
    name: string;
  };
  category: {
    name: string;
    color: string;
    slug: string;
  };
  slug: string;
  readingTime?: number;
  views: number;
}

interface BlogSectionProps {
  blogPosts: BlogPost[];
}

export const BlogSection: React.FC<BlogSectionProps> = ({ blogPosts }) => {
  if (blogPosts.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[var(--me-bg)] py-14 sm:py-20">
      <EventBackdrop variant="section" />
      <div className="relative mx-auto max-w-7xl lg:px-8">
        <SectionHeading
          title="News and tips"
          subtitle="Planning advice and updates from the MyEvent team"
          href="/blog"
          linkLabel="All articles"
        />
        <div className="me-rail scrollbar-hide me-rail--grid me-rail--grid3">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} blog={post} />
          ))}
        </div>
      </div>
    </section>
  );
};
