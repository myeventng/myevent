'use client';

import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Venue } from '@/generated/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MapPin,
  Users,
  Phone,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { ViewVenueModal } from './view-venue-modal';
import { CreateVenueModal } from './create-venue-modal';
import Image from 'next/image';

const defaultIcon = new L.Icon({
  iconUrl: '/red-pointer.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type VenueWithCity = Venue & {
  city: {
    name: string;
    state: string;
  };
};

interface VenuesMapProps {
  venues: VenueWithCity[];
  cities: any[];
  onVenueCreated: (venue: Venue) => void;
}

// Custom component to show tooltip on hover over marker
const VenueMarker = ({
  venue,
  onSelectVenue,
}: {
  venue: VenueWithCity;
  onSelectVenue: (venue: Venue) => void;
}) => {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current) return;

    const marker = markerRef.current;

    // Create a custom tooltip
    marker.on('mouseover', () => {
      if (!venue) return;

      // Create tooltip element
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'bg-white shadow-lg rounded-md p-3 max-w-[250px]';

      tooltipEl.innerHTML = `
        <div class="flex flex-col">
          ${
            venue.venueImageUrl
              ? `<div class="w-full h-32 relative mb-2 rounded-md overflow-hidden">
              <img src="${venue.venueImageUrl}" alt="${venue.name}" class="object-cover w-full h-full" />
            </div>`
              : ''
          }
          <div class="font-semibold">${venue.name}</div>
          <div class="text-xs text-gray-500 mb-1">${venue.city?.name}, ${
        venue.city?.state
      }</div>
          ${
            venue.capacity
              ? `<div class="text-xs flex items-center">
              <span class="mr-1">Capacity:</span> 
              <span class="font-medium">${venue.capacity}</span>
            </div>`
              : ''
          }
        </div>
      `;

      const tooltip = L.popup({
        offset: [0, -30],
        className: 'custom-popup',
        closeButton: false,
      })
        .setLatLng(marker.getLatLng())
        .setContent(tooltipEl)
        .openOn(map);

      // Store the tooltip reference
      (marker as any)._tooltip = tooltip;
    });

    marker.on('mouseout', () => {
      if ((marker as any)._tooltip) {
        map.closePopup((marker as any)._tooltip);
        (marker as any)._tooltip = null;
      }
    });

    // Handle click separately for the real popup
    marker.on('click', () => {
      if ((marker as any)._tooltip) {
        map.closePopup((marker as any)._tooltip);
        (marker as any)._tooltip = null;
      }
    });

    return () => {
      marker.off('mouseover');
      marker.off('mouseout');
      marker.off('click');
    };
  }, [venue, map]);

  return (
    <Marker
      ref={markerRef}
      position={[
        parseFloat(venue.latitude || '0'),
        parseFloat(venue.longitude || '0'),
      ]}
      icon={defaultIcon}
    >
      <Popup>
        <div className="text-center">
          <h3 className="font-semibold">{venue.name}</h3>
          <p className="text-xs">{venue.address}</p>
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto mt-1 text-xs"
            onClick={() => onSelectVenue(venue)}
          >
            View Details
          </Button>
        </div>
      </Popup>
    </Marker>
  );
};

const UserVenuesMap: React.FC<VenuesMapProps> = ({
  venues,
  cities,
  onVenueCreated,
}) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Calculate center position from all venues or use default
  const getMapCenter = () => {
    if (venues.length === 0) {
      return [9.0765, 7.3986]; // Default to Abuja, Nigeria
    }

    // Calculate average of all coordinates
    const totalLat = venues.reduce(
      (acc, venue) => acc + parseFloat(venue.latitude || '0'),
      0
    );
    const totalLng = venues.reduce(
      (acc, venue) => acc + parseFloat(venue.longitude || '0'),
      0
    );

    return [totalLat / venues.length, totalLng / venues.length];
  };

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setViewModalOpen(true);
  };

  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-background">
        <p className="text-muted-foreground mb-4">
          You haven't created any venues yet to display on the map.
        </p>
        <Button variant="default" onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Venue
        </Button>

        <CreateVenueModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onVenueCreated={onVenueCreated}
          cities={cities}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Venue
        </Button>
      </div>

      <div className="h-[600px] rounded-md overflow-hidden border">
        <MapContainer
          center={getMapCenter() as [number, number]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {venues.map((venue) => (
            <VenueMarker
              key={venue.id}
              venue={venue}
              onSelectVenue={handleSelectVenue}
            />
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.slice(0, 6).map((venue) => (
          <Card key={venue.id} className="overflow-hidden">
            {venue.venueImageUrl && (
              <div className="relative w-full h-40">
                <Image
                  src={venue.venueImageUrl}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <CardHeader className={`${venue.venueImageUrl ? 'pb-2' : 'pb-2'}`}>
              <CardTitle className="text-lg flex justify-between items-start">
                <div className="truncate">{venue.name}</div>
                <Badge variant="outline" className="ml-2 flex-shrink-0">
                  <Users className="h-3 w-3 mr-1" />
                  {venue.capacity}
                </Badge>
              </CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                {venue.city?.name}, {venue.city?.state}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm truncate mb-4">{venue.address}</p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSelectedVenue(venue);
                  setViewModalOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {venues.length > 6 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing 6 of {venues.length} venues. Use the map to see all venues.
        </div>
      )}

      {/* View Modal */}
      {selectedVenue && (
        <ViewVenueModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedVenue(null);
          }}
          venue={selectedVenue}
        />
      )}

      {/* Create Modal */}
      <CreateVenueModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onVenueCreated={onVenueCreated}
        cities={cities}
      />
    </div>
  );
};

export default UserVenuesMap;
