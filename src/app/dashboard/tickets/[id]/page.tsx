import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TicketDetailsPage } from '@/components/tickets/ticket-details-page';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

interface TicketDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TicketDetails({ params }: TicketDetailsProps) {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Await the params Promise
  const { id } = await params;

  return (
    <DashboardLayout session={session}>
      <TicketDetailsPage params={{ id }} />
    </DashboardLayout>
  );
}
