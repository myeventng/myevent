// src/app/dashboard/tickets/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserTicketsPage } from '@/components/tickets/user-ticket-page';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function UserTickets() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow both regular users and admins
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  return (
    <DashboardLayout session={session}>
      <UserTicketsPage />
    </DashboardLayout>
  );
}
