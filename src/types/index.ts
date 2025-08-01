import {
  Venue as PrismaVenue,
  City as PrismaCity,
  User as PrismaUser,
} from '@/generated/prisma';

// Base city type
export interface City {
  id: string;
  name: string;
  state: string;
  population?: number | null;
}

// Base user type for venues
export interface VenueUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

// Extended venue with city information
export interface VenueWithCity extends PrismaVenue {
  city: City | null;
}

// Extended venue with city and user information for admin tables
export interface VenueWithCityAndUser extends PrismaVenue {
  city: City | null;
  user: VenueUser | null;
}

// For API responses and forms
export type CreateVenueInput = {
  name: string;
  address: string;
  cityId: string;
  description?: string | null;
  contactInfo?: string | null;
  capacity?: number | null;
  venueImageUrl?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export type UpdateVenueInput = CreateVenueInput & {
  id: string;
};

// Utility type for venue transformations
export type VenueTransformOptions = {
  includeUser?: boolean;
  includeCity?: boolean;
};

// Helper function to transform VenueWithCity to VenueWithCityAndUser
export function addUserToVenue(
  venue: VenueWithCity,
  user: VenueUser | null = null
): VenueWithCityAndUser {
  return {
    ...venue,
    user,
  };
}

// Helper function to transform VenueWithCityAndUser to VenueWithCity
export function removeUserFromVenue(
  venue: VenueWithCityAndUser
): VenueWithCity {
  const { user, ...venueWithoutUser } = venue;
  return venueWithoutUser;
}

// Helper function to ensure venue has city data
export function ensureVenueHasCity(venue: any, cities: City[]): VenueWithCity {
  if (venue.city) {
    return venue as VenueWithCity;
  }

  const city = cities.find((c) => c.id === venue.cityId);
  return {
    ...venue,
    city: city || null,
  };
}

// Helper function to transform basic Venue to VenueWithCityAndUser
export function transformVenueToVenueWithCityAndUser(
  venue: PrismaVenue,
  cities: City[],
  user: VenueUser | null = null
): VenueWithCityAndUser {
  const city = cities.find((c) => c.id === venue.cityId) || null;
  return {
    ...venue,
    city,
    user,
  };
}

// Helper function to transform VenueWithCityAndUser back to basic Venue
export function extractBasicVenue(venue: VenueWithCityAndUser): PrismaVenue {
  const { city, user, ...basicVenue } = venue;
  return basicVenue;
}

//notification.types.ts
export interface NotificationMetadata {
  // Event related
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  organizerName?: string;
  organizerEmail?: string;

  // Ticket related
  orderId?: string;
  ticketId?: string;
  buyerName?: string;
  buyerEmail?: string;
  quantity?: number;
  totalAmount?: number;

  // Venue related
  venueId?: string;
  venueName?: string;

  // User related
  userId?: string;
  userName?: string;
  userEmail?: string;

  // Payment related
  payoutAmount?: number;
  refundAmount?: number;

  // Timing
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  purchasedAt?: string;
  processedAt?: string;
  requestedAt?: string;

  // Additional context
  rejectionReason?: string;
  cancellationReason?: string;
  periodStart?: string;
  periodEnd?: string;
  lowStockTickets?: Array<{
    id: string;
    name: string;
    remaining: number;
  }>;
  offerExpiresAt?: string;
  systemUpdate?: boolean;
  sentAt?: string;
  message?: string;
}

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  category: 'events' | 'tickets' | 'venues' | 'users' | 'payments' | 'system';
  requiresAction?: boolean;
  emailEnabled?: boolean;
}

// utils/notification-templates.ts
