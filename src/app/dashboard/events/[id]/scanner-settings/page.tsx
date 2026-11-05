import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { getScannerSettings } from '@/actions/scanner-settings.actions';
import { ScannerModeForm } from '@/components/dashboard/scanner/scanner-mode-form';

export const dynamic = 'force-dynamic';

export default async function ScannerSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });
  if (!session) redirect('/auth/login');
  const { id } = await params;
  const r = await getScannerSettings(id);
  if (!r.success) notFound();
  return (
    <DashboardLayout session={session}>
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">Scanner settings</h1><p className="text-muted-foreground">{r.data.eventTitle}</p></div>
        <ScannerModeForm eventId={id} initialMode={r.data.mode} canEdit={r.data.canEdit} />
      </div>
    </DashboardLayout>
  );
}
