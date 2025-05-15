import { DashboardLayout } from '@/components/dashboard-layout';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { Badge } from '@/components/ui/badge';

export default async function Venues() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });
  const isUserSuperAdmin = isSuperAdmin(session.user);
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Venues</h1>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>
        <div className="text-muted-foreground ">Coming Soon</div>
      </div>
    </DashboardLayout>
  );
}
