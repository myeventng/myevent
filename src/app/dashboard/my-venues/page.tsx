import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { getServerSideAuth } from '@/lib/auth-utils';
import { getUserVenues } from '@/actions/venue-actions';
import { VenueWithCityAndUser } from '@/types';
import { getCities } from '@/actions/city-actions';
import { ClientSideVenuesWrapper } from '@/components/venue/user-client-side-venues-wrapper';

export default async function MyVenuesPage() {
  // Get the authenticated session
  const session = await getServerSideAuth({
    // Allow both regular users and admins with the ORGANIZER subrole
    roles: ['USER', 'ADMIN'],
    subRoles: ['ORGANIZER'],
  });

  // Fetch user's venues and cities from database
  const venuesResponse = await getUserVenues();
  const citiesResponse = await getCities();

  const venues: VenueWithCityAndUser[] = Array.isArray(venuesResponse.data)
    ? venuesResponse.data
    : [];
  const cities: {
    name: string;
    id: string;
    population: number | null;
    state: string;
  }[] = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Venues</h1>
            <p className="text-muted-foreground">
              Manage venues you&apos;ve created for your events
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{session.user.subRole || 'USER'}</Badge>
          </div>
        </div>

        {/* Client side component for tabs and venue management */}
        <ClientSideVenuesWrapper initialVenues={venues} cities={cities} />
      </div>
    </DashboardLayout>
  );
}
