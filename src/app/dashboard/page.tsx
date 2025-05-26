import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserTicketsPage } from '@/components/tickets/user-ticket-page';
import { getServerSideAuth } from '@/lib/auth-utils';

export default async function UserTickets() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow both regular users and admins
  });

  return (
    <DashboardLayout session={session}>
      <UserTicketsPage />
    </DashboardLayout>
  );
}
