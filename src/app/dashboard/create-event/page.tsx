import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-utils';
import { isOrganizer } from '@/lib/client-auth-utils';
import { Badge } from '@/components/ui/badge';

export default async function CreateEvent() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });
  const isUserOrganizer = isOrganizer(session.user);
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create Event</h1>
          <Badge>{isUserOrganizer ? 'ORGANIZER' : 'USER'}</Badge>
        </div>

        <div className="text-muted-foreground ">Coming Soon</div>
      </div>
    </DashboardLayout>
  );
}
