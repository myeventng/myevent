'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define proper types for the venue
interface Location {
  latitude: number;
  longitude: number;
}

interface City {
  id: string;
  name: string;
  state: string;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: string;
  city: City;
  capacity: number | null;
  description?: string | null;
  contactInfo?: string | null;
  location?: Location;
  latitude?: string | number;
  longitude?: string | number;
  userId: string;
}

// Fix the default marker icon issue in Leaflet
L.Icon.Default.mergeOptions({
  iconUrl: '/red-pointer.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customIcon = L.icon({
  iconUrl: '/red-pointer.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface VenueViewProps {
  venue: Venue;
}

export const VenueView = ({ venue }: VenueViewProps) => {
  // Use state to handle client-side rendering of Leaflet map
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Enhanced location detection logic
  const getLocationCoordinates = (): [number, number] => {
    // Check for direct latitude/longitude properties first
    if (venue.latitude && venue.longitude) {
      return [Number(venue.latitude), Number(venue.longitude)];
    }

    // Fall back to nested location object if present
    if (
      venue.location &&
      typeof venue.location.latitude === 'number' &&
      typeof venue.location.longitude === 'number'
    ) {
      return [venue.location.latitude, venue.location.longitude];
    }

    // Default location if none of the above are available
    return [9.0563, 7.4985]; // Default to Nigeria
  };

  const position = getLocationCoordinates();

  // For displaying the coordinates in the UI
  const displayCoordinates = {
    latitude: position[0],
    longitude: position[1],
  };

  console.log('Venue data:', venue);
  console.log('Map coordinates being used:', position);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{venue.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium">Address</h3>
              <p className="text-gray-600">
                {venue.address}
                <br />
                {venue.city.name}, {venue.city.state}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Capacity</h3>
              <p className="text-gray-600">
                {venue.capacity
                  ? venue.capacity.toLocaleString()
                  : 'Not specified'}
              </p>
            </div>
          </div>

          {venue.description && (
            <div>
              <h3 className="text-lg font-medium">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">
                {venue.description}
              </p>
            </div>
          )}

          {venue.contactInfo && (
            <div>
              <h3 className="text-lg font-medium">Contact Information</h3>
              <p className="text-gray-600">{venue.contactInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map container - only render on client side */}
      {isMounted && (
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full rounded-md overflow-hidden">
              <MapContainer
                center={position}
                zoom={13}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={customIcon}>
                  <Popup>
                    <div>
                      <strong>{venue.name}</strong>
                      <br />
                      {venue.address}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Coordinates: {displayCoordinates.latitude.toFixed(6)},{' '}
              {displayCoordinates.longitude.toFixed(6)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
