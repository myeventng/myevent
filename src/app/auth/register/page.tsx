import { RegisterForm } from '@/components/auth/register-form';
import { SignInOauthButton } from '@/components/auth/sign-in-oauth-button';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Account</h1>
        <p className="text-gray-400">Join the MyEvent.com.ng community today</p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <SignInOauthButton provider="google" signUp />
          <SignInOauthButton provider="facebook" signUp />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">
              Or register with email
            </span>
          </div>
        </div>

        <RegisterForm />

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-purple-400 hover:text-purple-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-gray-500 text-xs text-center">
          By creating an account, you agree to our{' '}
          <Link
            href="/terms"
            className="text-gray-400 underline hover:text-gray-300"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="text-gray-400 underline hover:text-gray-300"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
