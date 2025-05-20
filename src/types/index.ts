export interface City {
  id: string;
  name: string;
  state: string;
  // add other fields if needed
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: string;
  userId: string;
  venueImageUrl: string | null;
  description: string | null;
  contactInfo: string | null;
  capacity: number | null;
  latitude: string | null;
  longitude: string | null;
}

export interface VenueWithCity extends Venue {
  city: City;
}
