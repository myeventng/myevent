import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

export default async function Analytics() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });
  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }
  const isUserOrganizer =
    session.user.role === 'USER' && session.user.subRole === 'ORGANIZER';
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analytics</h1>
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
