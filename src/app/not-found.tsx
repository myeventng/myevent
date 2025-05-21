import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 text-center sm:px-20">
        <div className="space-y-6 max-w-md">
          <div className="relative h-40 w-40 mx-auto">
            <Image
              src="/404-illustration.svg"
              alt="404 Illustration"
              fill
              priority
              className="object-contain dark:invert"
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            404 - Page Not Found
          </h1>

          <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl">
            We couldn't find the page you were looking for. It might have been
            moved or doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Link>
            </Button>
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
