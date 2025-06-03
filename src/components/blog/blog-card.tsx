'use client';

import { Calendar, Clock, Eye, User, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';

interface BlogCardProps {
  blog: {
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const cardClasses = {
    default:
      'group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1',
    featured:
      'group bg-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 border-2 border-gradient-to-r from-blue-500 to-purple-500',
    compact:
      'group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden',
  };

  const imageClasses = {
    default: 'h-48',
    featured: 'h-64',
    compact: 'h-32',
  };

  return (
    <Link href={`/blog/${blog.slug}`}>
      <article className={cardClasses[size]}>
        {/* Image */}
        {blog.featuredImage && (
          <div className={`relative ${imageClasses[size]} overflow-hidden`}>
            <Image
              width={500}
              height={500}
              src={blog.featuredImage}
              alt={blog.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Category Badge */}
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-semibold shadow-lg"
              style={{ backgroundColor: blog.category.color }}
            >
              {blog.category.name}
            </div>

            {/* Featured Badge */}
            {blog.featured && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                FEATURED
              </div>
            )}

            {/* Views Counter */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">
                {blog.views.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`p-${size === 'compact' ? '4' : '6'}`}>
          {/* Meta Info */}
          <div
            className={`flex items-center gap-4 text-sm text-gray-500 mb-${
              size === 'compact' ? '2' : '3'
            }`}
          >
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(blog.publishedAt || new Date().toISOString())}
              </span>
            </div>
            {blog.readingTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{blog.readingTime} min read</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3
            className={`font-bold text-gray-900 mb-${
              size === 'compact' ? '2' : '3'
            } line-clamp-2 group-hover:text-blue-600 transition-colors duration-300 ${
              size === 'featured'
                ? 'text-2xl'
                : size === 'compact'
                ? 'text-lg'
                : 'text-xl'
            }`}
          >
            {blog.title}
          </h3>

          {/* Excerpt */}
          {blog.excerpt && size !== 'compact' && (
            <p
              className={`text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed ${
                size === 'featured' ? 'text-base' : ''
              }`}
            >
              {blog.excerpt}
            </p>
          )}

          {/* Author & Read More */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {blog.author.name}
              </span>
            </div>

            <div className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors duration-300 group/button">
              Read More
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/button:translate-x-1" />
            </div>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </article>
    </Link>
  );
}
