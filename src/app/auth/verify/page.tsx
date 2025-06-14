import { SendVerificationEmailForm } from '@/components/auth/send-verification-email-form';
import Link from 'next/link';
import { ArrowLeftIcon, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getServerSideAuth } from '@/lib/auth-server';

interface PageProps {
  searchParams: Promise<{ error: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params?.error;

  if (!error) {
    try {
      // If no error, get user session to determine where to redirect
      const session = await getServerSideAuth();

      if (session && session.user) {
        const userRole = session.user.role;
        const userSubRole = session.user.subRole;

        // Redirect based on user role
        if (
          userRole === 'ADMIN' &&
          (userSubRole === 'STAFF' || userSubRole === 'SUPER_ADMIN')
        ) {
          redirect('/admin/dashboard');
        } else if (
          userRole === 'USER' &&
          (userSubRole === 'ORDINARY' || userSubRole === 'ORGANIZER')
        ) {
          redirect('/dashboard');
        } else {
          // Fallback for any other role combination
          redirect('/events');
        }
      } else {
        // If session or user is null, redirect to events
        redirect('/events');
      }
    } catch (error) {
      console.error('Error getting session:', error);
      // If error getting session, default redirect to events
      // This is a fallback in case session retrieval fails
      console.error('Error retrieving user session, redirecting to events.');
      console.error(error);
      // If error getting session, default redirect to events
      redirect('/events');
    }
  }

  // Format error message
  const errorMessage = error.replace(/_/g, ' ').replace(/-/g, ' ');

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
        <div className="mx-auto bg-amber-500/20 p-3 rounded-full w-16 h-16 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold">Email Verification</h1>
        <p className="text-gray-400 max-w-sm mx-auto">
          Your email needs to be verified to continue
        </p>
      </div>

      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p>
            <span className="capitalize font-medium">{errorMessage}</span> -
            Please request a new verification email.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SendVerificationEmailForm />
      </div>
    </div>
  );
}
