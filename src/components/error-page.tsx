'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, RotateCw } from 'lucide-react';

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  code?: number;
  title?: string;
  description?: string;
  isNotFound?: boolean;
}

export function ErrorPage({
  error,
  reset,
  code = 500,
  title = 'Something went wrong',
  description = 'We encountered an unexpected error. Please try again later.',
  isNotFound = false,
}: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  // If it's a 404 error
  if (isNotFound || code === 404) {
    title = 'Page not found';
    description = "Sorry, we couldn't find the page you're looking for.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 text-center sm:px-20">
        <div className="space-y-6 max-w-md">
          <div className="relative h-40 w-40 mx-auto">
            <Image
              src={
                isNotFound || code === 404
                  ? '/404-illustration.svg'
                  : '/error-illustration.svg'
              }
              alt={
                isNotFound || code === 404
                  ? '404 Illustration'
                  : 'Error Illustration'
              }
              fill
              priority
              className="object-contain dark:invert"
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            {isNotFound || code === 404
              ? '404 - Page Not Found'
              : `${code} - ${title}`}
          </h1>

          {error?.digest && (
            <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted max-w-fit mx-auto">
              <code>Error Digest: {error.digest}</code>
            </div>
          )}

          <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>

            {reset && (
              <Button onClick={reset} variant="outline" size="lg">
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}

            {!reset && (
              <Button asChild variant="outline" size="lg">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} EventHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
