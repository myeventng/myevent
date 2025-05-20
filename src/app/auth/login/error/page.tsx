import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, AlertCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ error: string }>;
}

export default async function LoginErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params?.error || 'unknown_error';

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    account_not_linked:
      'This account is already linked to another sign-in method.',
    invalid_credentials: 'The email or password you entered is incorrect.',
    user_not_found: "We couldn't find an account with that email address.",
    email_not_verified: 'Please verify your email address before logging in.',
    unknown_error: 'An unexpected error occurred. Please try again.',
  };

  const errorMessage = errorMessages[error] || errorMessages.unknown_error;

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

      <div className="text-center space-y-4">
        <div className="mx-auto bg-red-500/20 p-3 rounded-full w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold">Login Error</h1>
      </div>

      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Button
          asChild
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
        >
          <Link href="/auth/login">Try Again</Link>
        </Button>

        {error === 'account_not_linked' && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">
              Don't have an account yet?
            </p>
            <Button
              asChild
              variant="outline"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Link href="/auth/register">Create Account</Link>
            </Button>
          </div>
        )}

        {error === 'email_not_verified' && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">
              Didn't receive verification email?
            </p>
            <Button
              asChild
              variant="outline"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Link href="/auth/resend-verification">Resend Verification</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
