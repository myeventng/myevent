import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SubscribersManager } from '@/components/admin/subscribers-manager';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getSubscribers, type SubscriberFilters } from '@/actions/newsletter-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Sending a newsletter to many subscribers can take a while.
export const maxDuration = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SubscribersPage({
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
  const filters: SubscriberFilters = {
    page: Number(one(sp.page)) || 1,
    status: (one(sp.status) as SubscriberFilters['status']) || 'ALL',
    search: one(sp.search) || '',
  };
  const result = await getSubscribers(filters);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-muted-foreground">
            People who subscribed on the website. Add or remove subscribers, export the list and send a newsletter.
          </p>
        </div>

        {!result.success ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : (
          <SubscribersManager
            data={result.data}
            filters={{ status: filters.status, search: filters.search }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
