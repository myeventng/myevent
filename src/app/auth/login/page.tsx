import { LoginForm } from '@/components/auth/login-form';
import { MagicLinkLoginForm } from '@/components/auth/magic-link-login-form';
import { SignInOauthButton } from '@/components/auth/sign-in-oauth-button';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="space-y-8 w-full">
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
              href="/auth/register"
              className="text-purple-400 hover:text-purple-300"
            >
              Register now
            </Link>
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
