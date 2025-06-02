import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-utils';
import { isOrganizer } from '@/lib/client-auth-utils';
import { Badge } from '@/components/ui/badge';

export default async function Favourites() {
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
          <h1 className="text-2xl font-bold">My Favourites Events</h1>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {initials}
            </div>
            <Badge>{isUserOrganizer ? 'ORGANIZER' : 'USER'}</Badge>
          </div>
        </div>

        <div className="text-muted-foreground ">Coming Soon</div>
      </div>
    </DashboardLayout>
  );
}
