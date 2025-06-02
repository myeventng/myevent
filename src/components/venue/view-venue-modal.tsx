'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Users,
  Phone,
  Link as LinkIcon,
  Map,
  Building,
  Image as ImageIcon,
  User as UserIcon,
  Mail,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VenueWithCity, VenueWithCityAndUser } from '@/types';

// Import map component dynamically to avoid SSR issues
const StaticMap = dynamic(() => import('./static-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center bg-gray-100 rounded-md">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

interface ViewVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: VenueWithCity | VenueWithCityAndUser;
}

export const ViewVenueModal = ({
  isOpen,
  onClose,
  venue,
}: ViewVenueModalProps) => {
  // Format contact info if it exists and looks like URL, email, or phone
  const formatContactInfo = (info?: string | null) => {
    if (!info) return null;

    // Check if it's a URL
    if (info.match(/^(http|https):\/\//i)) {
      return (
        <a
          href={info}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center"
        >
          <LinkIcon className="h-4 w-4 mr-1" />
          {info.replace(/^https?:\/\//i, '')}
        </a>
      );
    }

    // Check if it's an email
    if (info.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return (
        <a
          href={`mailto:${info}`}
          className="text-blue-600 hover:underline flex items-center"
        >
          <LinkIcon className="h-4 w-4 mr-1" />
          {info}
        </a>
      );
    }

    // Otherwise treat as phone or other contact
    return (
      <div className="flex items-center">
        <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
        {info}
      </div>
    );
  };

  const position = {
    lat: parseFloat(venue.latitude || '0'),
    lng: parseFloat(venue.longitude || '0'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venue.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>
                {venue.city?.name}, {venue.city?.state}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Venue Image */}
          {venue.venueImageUrl && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <ImageIcon className="h-4 w-4 mr-1" />
                Venue Image
              </h3>
              <div className="relative w-full h-64 rounded-md overflow-hidden">
                <Image
                  src={venue.venueImageUrl}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Location Map */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Map className="h-4 w-4 mr-1" />
              Location
            </h3>
            <StaticMap position={position} name={venue.name} />
          </div>

          {/* Venue Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Building className="h-4 w-4 mr-1" />
                Venue Details
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div>{venue.address}</div>
                </div>

                {venue.contactInfo && (
                  <div>
                    <div className="text-sm text-muted-foreground">Contact</div>
                    <div>{formatContactInfo(venue.contactInfo)}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                    {venue.capacity} people
                  </div>
                </div>
              </div>
            </div>

            <div>
              {venue.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm">{venue.description}</p>
                </div>
              )}

              {/* Organizer Information */}
              {'user' in venue && venue.user && (
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    Organizer
                  </h3>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {venue.user.image ? (
                        <AvatarImage
                          src={venue.user.image}
                          alt={venue.user.name || 'Organizer'}
                        />
                      ) : null}
                      <AvatarFallback>
                        {venue.user.name
                          ? venue.user.name.substring(0, 2).toUpperCase()
                          : 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{venue.user.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {venue.user.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coordinates Info */}
          <div>
            <h3 className="text-sm font-medium mb-2">Coordinates</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Badge variant="outline" className="justify-start">
                Latitude: {venue.latitude}
              </Badge>
              <Badge variant="outline" className="justify-start">
                Longitude: {venue.longitude}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
