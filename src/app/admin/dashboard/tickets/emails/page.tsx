// src/app/admin/dashboard/tickets/emails/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EmailLogTable } from '@/components/admin/email-log-table';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getEmailLogs, type EmailLogFilters } from '@/actions/email-log.actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminEmailLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });
  if (!session) redirect('/unauthorized');

  const sp = await searchParams;
  const filters: EmailLogFilters = {
    page: Number(one(sp.page)) || 1,
    status: (one(sp.status) as EmailLogFilters['status']) || 'ALL',
    type: (one(sp.type) as EmailLogFilters['type']) || 'ALL',
    search: one(sp.search) || '',
    from: one(sp.from) || '',
    to: one(sp.to) || '',
  };

  const result = await getEmailLogs(filters);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Emails</h1>
          <p className="text-muted-foreground">
            Confirmation of every ticket email sent to buyers, with delivery
            status.
          </p>
        </div>

        {!result.success ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : (
          <EmailLogTable data={result.data} filters={filters} />
        )}
      </div>
    </DashboardLayout>
  );
}
