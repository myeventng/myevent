import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GenerationPaymentsTable } from '@/components/admin/ticket-generation/generation-payments-table';

export const metadata = { title: 'Ticket generation payments' };

export default async function TicketGenerationPaymentsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'ADMIN') redirect('/auth/login');
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket generation payments</h1>
          <p className="text-sm text-muted-foreground">Fees organizers paid to the platform for generating physical tickets.</p>
        </div>
        <GenerationPaymentsTable />
      </div>
    </DashboardLayout>
  );
}
