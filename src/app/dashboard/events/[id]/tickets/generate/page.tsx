import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { getGenerateFormOptions } from '@/actions/ticket-generation.actions';
import { GenerateForm } from '@/components/dashboard/ticket-generation/generate-form';

export const dynamic = 'force-dynamic';

export default async function GenerateTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string; payment?: string }>;
}) {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });
  if (!session) redirect('/auth/login');
  const { id } = await params;
  const sp = await searchParams;
  // Authorization (owner / admin / staff with GENERATE_TICKETS on this event) is enforced in the action.
  const opts = await getGenerateFormOptions(id);
  if (!opts.success) notFound();
  const o = opts.data;
  return (
    <DashboardLayout session={session}>
      <GenerateForm
        eventId={o.event.id}
        eventTitle={o.event.title}
        eventEnded={o.eventEnded}
        ticketTypes={o.ticketTypes}
        defaults={o.defaults}
        layouts={o.layouts}
        tiers={o.tiers}
        max={o.max}
        highlightBatchId={sp.batch}
        paymentFlag={sp.payment}
      />
    </DashboardLayout>
  );
}
