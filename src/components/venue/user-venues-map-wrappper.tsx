'use client';

import dynamic from 'next/dynamic';
import { City, Venue } from '@/generated/prisma';

const UserVenuesMap = dynamic(() => import('./user-venues-map'), {
  ssr: false,
});

interface Props {
  venues: Venue[];
  cities: City[];
  onVenueCreated: (venue: Venue) => void;
}

export default function UserVenuesMapClientWrapper({
  venues,
  cities,
  onVenueCreated,
}: Props) {
  return (
    <UserVenuesMap
      venues={venues}
      cities={cities}
      onVenueCreated={onVenueCreated}
    />
  );
}
