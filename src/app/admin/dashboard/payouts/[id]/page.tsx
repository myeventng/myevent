// src/app/admin/dashboard/payouts/[id]/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PayoutDetailsPage } from '@/components/admin/payout-details-page';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

interface PayoutDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PayoutDetails({ params }: PayoutDetailsProps) {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  const { id } = await params;

  return (
    <DashboardLayout session={session}>
      <PayoutDetailsPage payoutId={id} />
    </DashboardLayout>
  );
}
