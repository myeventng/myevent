'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List } from 'lucide-react';
import { UserVenuesTable } from '@/components/venue/user-venues-table';
import dynamic from 'next/dynamic';
import { Venue, City } from '@/generated/prisma';

// Import map component dynamically to avoid SSR issues
const UserVenuesMapClientWrapper = dynamic(
  () => import('@/components/venue/user-venues-map-wrappper'),
  { ssr: false }
);

interface ClientSideVenuesWrapperProps {
  initialVenues: Venue[];
  cities: City[];
}

export function ClientSideVenuesWrapper({
  initialVenues,
  cities,
}: ClientSideVenuesWrapperProps) {
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [activeTab, setActiveTab] = useState('list');

  const handleVenueCreated = (newVenue: Venue) => {
    setVenues((prev) => [...prev, newVenue]);
  };

  const handleVenueUpdated = (updatedVenue: Venue) => {
    setVenues((prev) =>
      prev.map((venue) => (venue.id === updatedVenue.id ? updatedVenue : venue))
    );
  };

  const handleVenueDeleted = (deletedVenueId: string) => {
    setVenues((prev) => prev.filter((venue) => venue.id !== deletedVenueId));
  };

  return (
    <Tabs
      defaultValue="list"
      value={activeTab}
      onValueChange={setActiveTab}
      className="space-y-4"
    >
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
        <UserVenuesTable initialData={venues} cities={cities} />
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        <UserVenuesMapClientWrapper
          venues={venues}
          cities={cities}
          onVenueCreated={handleVenueCreated}
        />
      </TabsContent>
    </Tabs>
  );
}
