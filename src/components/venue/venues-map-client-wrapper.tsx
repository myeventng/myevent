'use client';

import dynamic from 'next/dynamic';
import { VenueWithCity, VenueWithCityAndUser } from '@/types';

const VenuesMap = dynamic(() => import('./venues-map'), {
  ssr: false,
});

interface Props {
  venues: VenueWithCity[];
}

export default function VenuesMapClientWrapper({ venues }: Props) {
  const venuesWithUser: VenueWithCityAndUser[] = venues.map((venue) => ({
    ...venue,
    user: null,
  }));

  return <VenuesMap venues={venuesWithUser} />;
}
