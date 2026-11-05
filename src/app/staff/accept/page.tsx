import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AcceptInviteCard } from './accept-card';

export const metadata = { title: 'Accept team invitation', robots: { index: false, follow: false } };

export default async function AcceptStaffInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) redirect('/');
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/auth/login?redirectTo=${encodeURIComponent(`/staff/accept?token=${token}`)}`);
  }
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <AcceptInviteCard token={token} email={session.user.email} />
    </main>
  );
}
