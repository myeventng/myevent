'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInEmailAction } from '@/actions/sign-in-email.action';
import { useSession } from '@/lib/auth-client';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  HomeIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import Link from 'next/link';

export const LoginForm = () => {
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const redirectTo = searchParams.get('redirectTo') || '/events';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (mounted && session?.user) {
      console.log('Already logged in, redirecting to:', redirectTo);
      router.push(redirectTo);
    }
  }, [session, mounted, router, redirectTo]);

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setIsPending(true);

    const formData = new FormData(evt.currentTarget);
    const { error } = await signInEmailAction(formData);

    if (error) {
      toast.error(error);
      setIsPending(false);
    } else {
      toast.success('Login successful. Good to have you back.');

      // Small delay to ensure session is established
      setTimeout(() => {
        console.log('Redirecting to:', redirectTo);
        router.push(redirectTo);
        // Force a page refresh to ensure session sync
        setTimeout(() => (window.location.href = redirectTo), 100);
      }, 500);
    }
  }

  // Don't show form if user is already logged in
  if (session?.user) {
    return (
      <div className="text-center space-y-4">
        <div className="text-gray-300">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Redirect Information */}
      {redirectTo !== '/events' && (
        <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-purple-300 text-sm">
            <ArrowLeftIcon className="h-4 w-4" />
            <span>
              You&apos;ll be redirected to your requested page after login
            </span>
          </div>
          <div className="text-xs text-purple-400 mt-1">
            Destination: {redirectTo}
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            Email
          </Label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">
            Password
          </Label>
          <div className="relative">
            <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="••••••••"
              className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
              required
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
              disabled={isPending}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          disabled={isPending}
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
};
