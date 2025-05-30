// components/homepage/BlogSection.tsx
'use client';

import React from 'react';
import { ArrowRight, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';

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
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  if (blogPosts.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-r from-orange-400 via-red-500 to-pink-600">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Latest News & Tips
          </h2>
          <p className="text-xl text-white/90">
            Stay updated with the latest in event planning and industry insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {blogPosts.map((post) => (
            <Card
              key={post.id}
              className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden group hover:shadow-2xl hover:bg-white/20 transition-all duration-300"
            >
              <div className="aspect-[16/10] overflow-hidden">
                {post.featuredImage ? (
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <div className="text-center text-white/60">
                      <h3 className="text-lg font-semibold mb-2">No Image</h3>
                      <p className="text-sm">Blog Post</p>
                    </div>
                  </div>
                )}
              </div>
              <CardContent className="p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    className="text-white border-white/30"
                    style={{ backgroundColor: post.category.color }}
                  >
                    {post.category.name}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Eye className="h-3 w-3" />
                    <span>{formatViews(post.views)}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-white/90 transition-colors">
                  {post.title}
                </h3>

                {post.excerpt && (
                  <p className="text-white/80 mb-4 line-clamp-3 text-sm">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-white/70">By {post.author.name}</span>
                    {post.readingTime && (
                      <div className="flex items-center gap-1 text-white/70">
                        <Clock className="h-3 w-3" />
                        <span>{post.readingTime} min read</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">
                    {formatDate(post.publishedAt)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-white text-black hover:bg-gray-100"
                    asChild
                  >
                    <Link href={`/blog/${post.slug}`}>Read More</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-100"
            asChild
          >
            <Link href="/blog">
              View All Articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
