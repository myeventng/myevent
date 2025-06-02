'use client';

import dynamic from 'next/dynamic';
import { City, Venue } from '@/generated/prisma';
import { VenueWithCityAndUser, VenueUser } from '@/types';

const UserVenuesMap = dynamic(() => import('./user-venues-map'), {
  ssr: false,
});

interface Props {
  venues: VenueWithCityAndUser[];
  cities: City[];
  onVenueCreated: (venue: VenueWithCityAndUser) => void;
}

// Type guard to check if venue has required properties
function isValidVenue(venue: any): venue is Venue {
  return (
    venue &&
    typeof venue.id === 'string' &&
    typeof venue.name === 'string' &&
    typeof venue.address === 'string' &&
    typeof venue.cityId === 'string' &&
    typeof venue.userId === 'string'
  );
}

export default function UserVenuesMapClientWrapper({
  venues,
  cities,
  onVenueCreated,
}: Props) {
  const handleVenueCreated = (venue: any) => {
    if (!isValidVenue(venue)) {
      console.error('Invalid venue data received:', venue);
      return;
    }

    // Find the city for this venue
    const city = cities.find((c) => c.id === venue.cityId);

    // Create VenueWithCityAndUser
    const venueWithCityAndUser: VenueWithCityAndUser = {
      ...venue,
      city: city
        ? {
            id: city.id,
            name: city.name,
            state: city.state,
            population: city.population,
          }
        : null,
      user: null, // New venues typically don't have user data populated yet
    };

    onVenueCreated(venueWithCityAndUser);
  };

  return (
    <UserVenuesMap
      venues={venues}
      cities={cities}
      onVenueCreated={handleVenueCreated}
    />
  );
}
