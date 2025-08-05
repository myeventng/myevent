// src/app/admin/dashboard/reports/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth-utils';
import { Badge } from '@/components/ui/badge';

export default async function Reports() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });
  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }
  const isUserSuperAdmin = isSuperAdmin(session.user);
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reports</h1>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>
        <div className="text-muted-foreground ">Coming Soon</div>
      </div>
    </DashboardLayout>
  );
}
