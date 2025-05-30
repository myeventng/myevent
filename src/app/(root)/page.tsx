import { Metadata } from 'next';
import { HomepageClient } from '@/components/homepage/homepage-client';

export const metadata: Metadata = {
  title: 'Discover Events | Your Event Platform',
  description:
    'Find amazing events happening near you. Search, filter, and discover events that match your interests.',
  keywords:
    'events, discover, search, filter, entertainment, conferences, workshops',
  openGraph: {
    title: 'Discover Events',
    description: 'Find amazing events happening near you',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomepageClient />;
}
