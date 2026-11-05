import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { BRANDED_LAYOUTS, CODES_ONLY_LAYOUTS } from '@/lib/ticket-generation/pdf';
import { DefaultsForm } from '@/components/dashboard/ticket-generation/defaults-form';

export const dynamic = 'force-dynamic';

export default async function TicketGenerationSettingsPage() {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });
  if (!session) redirect('/auth/login');
  const s = await prisma.organizerTicketGenerationSettings.findFirst({ where: { organizerId: session.user.id, scopeKey: 'DEFAULT' } });
  return (
    <DashboardLayout session={session}>
      <DefaultsForm
        initial={{ codeFormat: s?.codeFormat ?? 'QR', design: s?.design ?? 'BRANDED', ticketsPerPage: s?.ticketsPerPage ?? 4, showSerial: s?.showSerial ?? true, organizerLabel: s?.organizerLabel ?? null }}
        layouts={{ BRANDED: [...BRANDED_LAYOUTS], CODES_ONLY: [...CODES_ONLY_LAYOUTS] }}
      />
    </DashboardLayout>
  );
}
