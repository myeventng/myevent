// app/admin/dashboard/events/featured/page.tsx

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FeaturedEventsTable } from '@/components/admin/featured-events-table';
import { getEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function FeaturedEventsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  const response = await getEvents(false);
  const allEvents =
    Array.isArray(response.data) && response.success ? response.data : [];

  const featuredEvents = allEvents.filter(
    (event: any) => event.featured === true && !event.isCancelled
  );

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Featured Events</h1>
            <p className="text-muted-foreground">
              Manage events that are currently featured on the platform. You can
              remove events from the featured list individually or in bulk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {featuredEvents.length} Featured
            </div>
          </div>
        </div>

        <FeaturedEventsTable
          initialData={featuredEvents ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
