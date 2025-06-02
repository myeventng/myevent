import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeftIcon } from 'lucide-react';

export default function ForgotPasswordSuccessPage() {
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
        <h1 className="text-3xl font-bold">Check Your Email</h1>
        <p className="text-gray-400 max-w-sm mx-auto">
          We&apos;ve sent a password reset link to your email address. The link
          will expire in 30 minutes.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-sm">
          <p className="text-gray-300 mb-2">
            <strong>Didn&apos;t receive the email?</strong>
          </p>
          <ul className="text-gray-400 list-disc pl-5 space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure the email address is correct</li>
            <li>Wait a few minutes for the email to arrive</li>
          </ul>
        </div>

        <div className="text-center">
          <Button
            asChild
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
