'use client';

import dynamic from 'next/dynamic';
import { type VenueWithCity } from '@/types';

const VenuesMap = dynamic(() => import('./venues-map'), {
  ssr: false,
});

interface Props {
  venues: VenueWithCity[];
}

export default function VenuesMapClientWrapper({ venues }: Props) {
  return <VenuesMap venues={venues} />;
}
