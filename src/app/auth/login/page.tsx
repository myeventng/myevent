'use client';
export const dynamic = 'force-dynamic';

import { LoginForm } from '@/components/auth/login-form';
import { MagicLinkLoginForm } from '@/components/auth/magic-link-login-form';
import { SignInOauthButton } from '@/components/auth/sign-in-oauth-button';
import { useSearchParams } from 'next/navigation';
import { HomeIcon, CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/events';

  return (
    <div className="space-y-8 w-full">
      {/* Navigation Links */}
      <div className="flex justify-center space-x-8 text-sm border-b border-gray-700 pb-4">
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 group"
        >
          <HomeIcon className="h-4 w-4 group-hover:text-purple-400" />
          <span className="group-hover:text-purple-400">Home</span>
        </Link>
        <Link
          href="/events"
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 group"
        >
          <CalendarIcon className="h-4 w-4 group-hover:text-purple-400" />
          <span className="group-hover:text-purple-400">Browse Events</span>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-gray-400">Sign in to continue to your account</p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <SignInOauthButton provider="google" />
          <SignInOauthButton provider="facebook" />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <LoginForm />

        <MagicLinkLoginForm />

        <div className="text-center space-y-2">
          <p className="text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href={`/auth/register${
                redirectTo !== '/events'
                  ? `?redirectTo=${encodeURIComponent(redirectTo)}`
                  : ''
              }`}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Register now
            </Link>
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors block"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
