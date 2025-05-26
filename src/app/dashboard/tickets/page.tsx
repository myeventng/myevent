import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TicketDetailsPage } from '@/components/tickets/ticket-details-page';
import { getServerSideAuth } from '@/lib/auth-utils';

interface TicketDetailsProps {
  params: {
    id: string;
  };
}

export default async function TicketDetails({ params }: TicketDetailsProps) {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'], // Allow both regular users and admins
  });

  return (
    <DashboardLayout session={session}>
      <TicketDetailsPage params={params} />
    </DashboardLayout>
  );
}
