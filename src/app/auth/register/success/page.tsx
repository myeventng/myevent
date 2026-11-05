import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeftIcon, MailIcon } from 'lucide-react';
import { ResendVerificationButton } from '@/components/auth/resend-verification-button';

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function RegisterSuccessPage({ searchParams }: PageProps) {
  const { email } = await searchParams;
  const hasEmail = Boolean(email && email.includes('@'));

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
        <div className="mx-auto bg-green-500/20 p-3 rounded-full w-16 h-16 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">Check your inbox</h1>
        <p className="text-gray-400 max-w-sm mx-auto">
          Your account has been created. Verify your email address to activate
          it and sign in.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-sm">
          <div className="flex items-start gap-3">
            <MailIcon className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-300 font-medium">
                Verification Email Sent
              </p>
              <p className="text-gray-400 mt-1">
                We&apos;ve sent a verification link to{' '}
                {hasEmail ? (
                  <span className="text-white font-medium break-all">
                    {email}
                  </span>
                ) : (
                  'your email address'
                )}
                . Click the link to activate your account. The link expires in
                1 hour, and it may take a minute to arrive, so check your spam
                folder too.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {hasEmail && <ResendVerificationButton email={email as string} />}
          <Button
            asChild
            variant="ghost"
            className="text-purple-400 hover:text-purple-300 hover:bg-transparent"
          >
            <Link href="/auth/login">Already verified? Go to login</Link>
          </Button>
        </div>

        {hasEmail && (
          <p className="text-gray-500 text-xs text-center">
            Wrong email address?{' '}
            <Link
              href="/auth/register"
              className="text-gray-400 underline hover:text-gray-300"
            >
              Register again
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
