// app/auth/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const token = (await searchParams).token;

  if (!token) {
    redirect('/auth/login');
  }

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
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-gray-400">
          Create a new secure password for your account
        </p>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  );
}
