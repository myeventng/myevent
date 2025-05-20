import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { CitiesTable } from '@/components/cities/cities-table';
import { getCities } from '@/actions/city-actions';

export default async function Cities() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch cities from database
  const response = await getCities();
  const cities = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cities</h1>
            <p className="text-muted-foreground">
              Manage cities that can be associated with venues and events
            </p>
          </div>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        <CitiesTable
          initialData={cities ?? []}
          userCanCreate={isUserSuperAdmin || session.user.subRole === 'STAFF'}
        />
      </div>
    </DashboardLayout>
  );
}
