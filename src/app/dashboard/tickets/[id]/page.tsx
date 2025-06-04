import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TicketDetailsPage } from '@/components/tickets/ticket-details-page';
import { getServerSideAuth } from '@/lib/auth-utils';

interface TicketDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TicketDetails({ params }: TicketDetailsProps) {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  // Await the params Promise
  const { id } = await params;

  return (
    <DashboardLayout session={session}>
      <TicketDetailsPage params={{ id }} />
    </DashboardLayout>
  );
}
