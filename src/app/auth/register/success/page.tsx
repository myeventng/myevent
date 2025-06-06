import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeftIcon, MailIcon } from 'lucide-react';

export default function RegisterSuccessPage() {
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
        <h1 className="text-3xl font-bold">Registration Successful</h1>
        <p className="text-gray-400 max-w-sm mx-auto">
          Your account has been created. Please check your email to verify your
          account.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-sm">
          <div className="flex items-start gap-3">
            <MailIcon className="h-5 w-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-gray-300 font-medium">
                Verification Email Sent
              </p>
              <p className="text-gray-400 mt-1">
                We&apos;ve sent an email with a verification link. Please check
                your inbox and click the link to activate your account.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            asChild
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Link href="/auth/login">Go to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
