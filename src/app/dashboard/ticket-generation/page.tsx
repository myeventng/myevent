import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchHistory } from '@/components/dashboard/ticket-generation/batch-history';

export const dynamic = 'force-dynamic';

export default async function TicketGenerationHistoryPage() {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });
  if (!session) redirect('/auth/login');
  return (
    <DashboardLayout session={session}>
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">Physical ticket generation</h1><p className="text-muted-foreground">Every batch across your events. To create a new batch, open an event and choose Generate tickets.</p></div>
        <Card><CardHeader><CardTitle>Batch history</CardTitle><CardDescription>Generated, unused and validated counts update as tickets are scanned.</CardDescription></CardHeader><CardContent><BatchHistory /></CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
