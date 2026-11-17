import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ContactMessagesManager } from '@/components/admin/contact-messages-manager';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getContactMessages, type ContactFilters } from '@/actions/contact-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactMessagesPage({
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
  const filters: ContactFilters = {
    page: Number(one(sp.page)) || 1,
    status: (one(sp.status) as ContactFilters['status']) || 'ALL',
    search: one(sp.search) || '',
  };
  const result = await getContactMessages(filters);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Contact Messages</h1>
          <p className="text-muted-foreground">
            Messages sent through the Contact page. Open one to read it, reply by email, add a private note or archive it.
          </p>
        </div>

        {!result.success ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : (
          <ContactMessagesManager
            data={result.data}
            filters={{ status: filters.status, search: filters.search }}
            openId={one(sp.id)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
