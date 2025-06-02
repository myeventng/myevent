import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { AdminVenuesTable } from '@/components/venue/venues-table';
import { getVenues } from '@/actions/venue-actions';
import { getCities } from '@/actions/city-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List } from 'lucide-react';
import VenuesMapClientWrapper from '@/components/venue/venues-map-client-wrapper';

export default async function Venues() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow ADMIN role
    subRoles: ['ORGANIZER', 'STAFF', 'SUPER_ADMIN'], // Allow these subroles
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch venues and cities from database
  const venuesResponse = await getVenues();
  const citiesResponse = await getCities();

  const venues = venuesResponse.success ? venuesResponse.data : [];
  const cities = citiesResponse.success ? citiesResponse.data : [];

  // Check if user can create venues (ADMIN or ORGANIZER or SUPER_ADMIN)
  const userCanCreate =
    session.user.role === 'ADMIN' ||
    session.user.subRole === 'ORGANIZER' ||
    session.user.subRole === 'SUPER_ADMIN';

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Venues</h1>
            <p className="text-muted-foreground">
              Manage venues for your events
            </p>
          </div>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              Map View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <AdminVenuesTable
              initialData={venues ?? []}
              cities={cities ?? []}
              userCanCreate={userCanCreate}
            />
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <VenuesMapClientWrapper venues={venues ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
