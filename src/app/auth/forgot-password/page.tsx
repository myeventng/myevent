import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center mb-6">
        <Link
          href="/auth/login"
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to login
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="text-gray-400">
          No worries, we'll send you reset instructions
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center space-y-4">
        <p className="text-gray-400 text-sm">
          Remember your password?{' '}
          <Link
            href="/auth/login"
            className="text-purple-400 hover:text-purple-300"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
