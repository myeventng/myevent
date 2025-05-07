'use client';
import React, { useState } from 'react';
import {
  Filter,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Heart,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import PagesHero from '@/components/section/events-page/PagesHero';

// Define types for your data
type AgeRestriction = 'EIGHTEEN_PLUS' | 'TWENTY_ONE_PLUS' | 'ALL_AGES';
type DressCode = 'CASUAL' | 'BUSINESS_CASUAL' | 'FORMAL';
type PublishedStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
  city: string;
  longitude: string;
  latitude: string;
}

interface City {
  id: string;
  name: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: Date;
  imageUrls: string[];
  coverImageUrl?: string;
  startDateTime: Date;
  endDateTime: Date;
  isFree: boolean;
  url?: string;
  age?: AgeRestriction;
  dressCode?: DressCode;
  lateEntry?: Date;
  idRequired?: boolean;
  categoryId?: string;
  category?: Category;
  userId?: string;
  venueId: string;
  venue: Venue;
  tags: Tag[];
  attendeeLimit?: number;
  featured: boolean;
  embeddedVideoUrl?: string;
  ticketTypes: TicketType[];
  isCancelled?: boolean;
  publishedStatus: PublishedStatus;
  cityId?: string;
  City?: City;
}

interface FilterState {
  date: string;
  price: string;
  priceRange: [number, number];
  categories: string[];
}

// Sample data based on your Event schema
const sampleEvents: Event[] = [
  {
    id: '1',
    title: 'Summer Music Festival',
    description:
      'A three-day music festival featuring top artists from around the world',
    location: 'Riverside Park',
    createdAt: new Date('2025-02-01'),
    imageUrls: ['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
    startDateTime: new Date('2025-06-10T16:00:00'),
    endDateTime: new Date('2025-06-12T23:00:00'),
    isFree: false,
    url: 'https://summermusicfest.com',
    age: 'EIGHTEEN_PLUS',
    dressCode: 'CASUAL',
    idRequired: true,
    categoryId: '1',
    category: { id: '1', name: 'Music' },
    venueId: '1',
    venue: {
      id: '1',
      name: 'Riverside Park',
      city: 'New York',
      latitude: '40.785091',
      longitude: '-73.968285',
    },
    tags: [
      { id: '1', name: 'Music', color: '#BC00F0' },
      { id: '2', name: 'Festival', color: '#DAC0DE' },
    ],
    attendeeLimit: 5000,
    featured: true,
    ticketTypes: [
      { id: '1', name: 'VIP', price: 15000000 },
      { id: '2', name: 'Regular', price: 2000000 },
      { id: '3', name: 'Stands', price: 15000 },
    ],
    publishedStatus: 'PUBLISHED',
    cityId: '1',
    City: { id: '1', name: 'New York' },
  },
  {
    id: '2',
    title: 'Tech Conference 2025',
    description: 'Annual tech conference featuring the latest innovations',
    location: 'Convention Center',
    createdAt: new Date('2025-01-15'),
    imageUrls: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    startDateTime: new Date('2025-04-05T09:00:00'),
    endDateTime: new Date('2025-04-07T18:00:00'),
    isFree: false,
    url: 'https://techconf2025.com',
    dressCode: 'BUSINESS_CASUAL',
    idRequired: true,
    categoryId: '2',
    category: { id: '2', name: 'Technology' },
    venueId: '2',
    venue: {
      id: '2',
      name: 'Convention Center',
      city: 'San Francisco',
      latitude: '37.774929',
      longitude: '-122.419416',
    },
    tags: [
      { id: '3', name: 'Tech', color: '#ED3005' },
      { id: '4', name: 'Innovation', color: '#DD0ZZ0' },
    ],
    attendeeLimit: 2000,
    featured: true,
    ticketTypes: [{ id: '2', name: 'Professional', price: 499 }],
    publishedStatus: 'PUBLISHED',
    cityId: '2',
    City: { id: '2', name: 'San Francisco' },
  },
  {
    id: '3',
    title: 'Community Art Workshop',
    description: 'Free art workshop for all ages',
    location: 'Community Center',
    createdAt: new Date('2025-02-20'),
    imageUrls: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b',
    startDateTime: new Date('2025-03-25T14:00:00'),
    endDateTime: new Date('2025-03-25T17:00:00'),
    isFree: true,
    categoryId: '3',
    category: { id: '3', name: 'Arts & Crafts' },
    venueId: '3',
    venue: {
      id: '3',
      name: 'Community Center',
      city: 'Chicago',
      latitude: '41.8781',
      longitude: '-87.6298',
    },
    tags: [
      { id: '5', name: 'Art', color: '#FADC05' },
      { id: '6', name: 'Workshop', color: '#AAAAAA' },
    ],
    attendeeLimit: 50,
    featured: false,
    ticketTypes: [],
    publishedStatus: 'PUBLISHED',
    cityId: '3',
    City: { id: '3', name: 'Chicago' },
  },
  {
    id: '4',
    title: 'Charity Gala Dinner',
    description:
      'Annual charity gala raising funds for local homeless shelters',
    location: 'Grand Hotel',
    createdAt: new Date('2025-01-25'),
    imageUrls: ['https://images.unsplash.com/photo-1519671482749-fd09be7ccebf'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf',
    startDateTime: new Date('2025-05-15T18:30:00'),
    endDateTime: new Date('2025-05-15T23:00:00'),
    isFree: false,
    age: 'TWENTY_ONE_PLUS',
    dressCode: 'FORMAL',
    idRequired: true,
    categoryId: '4',
    category: { id: '4', name: 'Charity' },
    venueId: '4',
    venue: {
      id: '4',
      name: 'Grand Hotel',
      city: 'Los Angeles',
      latitude: '34.0522',
      longitude: '-118.2437',
    },
    tags: [
      { id: '7', name: 'Charity', color: '#3005' },
      { id: '8', name: 'Gala', color: '#DDBZZ0' },
    ],
    attendeeLimit: 300,
    featured: true,
    ticketTypes: [
      { id: '3', name: 'Premium Table', price: 1000 },
      { id: '2', name: 'Regular', price: 500 },
    ],
    publishedStatus: 'PUBLISHED',
    cityId: '4',
    City: { id: '4', name: 'Los Angeles' },
  },
  {
    id: '5',
    title: 'Food & Wine Expo',
    description:
      'Taste the best wines and gourmet foods from around the world.',
    location: 'Exhibition Center',
    createdAt: new Date('2025-03-01'),
    imageUrls: ['https://images.unsplash.com/photo-1518562923427-19e694d60036'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1518562923427-19e694d60036',
    startDateTime: new Date('2025-07-20T11:00:00'),
    endDateTime: new Date('2025-07-22T22:00:00'),
    isFree: false,
    url: 'https://foodwineexpo.com',
    dressCode: 'BUSINESS_CASUAL',
    idRequired: false,
    categoryId: '5',
    category: { id: '5', name: 'Food & Drink' },
    venueId: '5',
    venue: {
      id: '5',
      name: 'Exhibition Center',
      city: 'Paris',
      latitude: '48.8566',
      longitude: '2.3522',
    },
    tags: [
      { id: '9', name: 'Wine', color: '#8B0000' },
      { id: '10', name: 'Gourmet', color: '#D4AF37' },
    ],
    attendeeLimit: 10000,
    featured: true,
    ticketTypes: [{ id: '4', name: 'VIP', price: 250 }],
    publishedStatus: 'PUBLISHED',
    cityId: '5',
    City: { id: '5', name: 'Paris' },
  },
  {
    id: '6',
    title: 'Startup Pitch Night',
    description: 'Watch top startups pitch their ideas to investors.',
    location: 'Tech Hub',
    createdAt: new Date('2025-04-10'),
    imageUrls: ['https://images.unsplash.com/photo-1504384308090-c894fdcc538d'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
    startDateTime: new Date('2025-08-15T18:00:00'),
    endDateTime: new Date('2025-08-15T21:00:00'),
    isFree: true,
    url: 'https://startuppitchnight.com',
    dressCode: 'CASUAL',
    idRequired: false,
    categoryId: '6',
    category: { id: '6', name: 'Business' },
    venueId: '6',
    venue: {
      id: '6',
      name: 'Tech Hub',
      city: 'San Francisco',
      latitude: '37.7749',
      longitude: '-122.4194',
    },
    tags: [
      { id: '11', name: 'Startups', color: '#FF4500' },
      { id: '12', name: 'Investors', color: '#228B22' },
    ],
    attendeeLimit: 500,
    featured: false,
    ticketTypes: [],
    publishedStatus: 'PUBLISHED',
    cityId: '6',
    City: { id: '6', name: 'San Francisco' },
  },
  {
    id: '7',
    title: 'Art & Craft Fair',
    description: 'Discover local artists and their works.',
    location: 'Art Gallery',
    createdAt: new Date('2025-05-05'),
    imageUrls: ['https://images.unsplash.com/photo-1518562923427-19e694d60036'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1518562923427-19e694d60036',
    startDateTime: new Date('2025-09-10T10:00:00'),
    endDateTime: new Date('2025-09-10T16:00:00'),
    isFree: false,
    url: 'https://artcraftfair.com',
    dressCode: 'BUSINESS_CASUAL',
    idRequired: false,
    categoryId: '7',
    category: { id: '7', name: 'Arts & Crafts' },
    venueId: '7',
    venue: {
      id: '7',
      name: 'Art Gallery',
      city: 'New York',
      latitude: '40.7128',
      longitude: '-74.0060',
    },
    tags: [
      { id: '13', name: 'Art', color: '#ff7411' },
      { id: '14', name: 'Crafts', color: '#12f812' },
    ],
    attendeeLimit: 1000,
    featured: true,
    ticketTypes: [{ id: '5', name: 'General Admission', price: 50 }],
    publishedStatus: 'PUBLISHED',
    cityId: '7',
    City: { id: '7', name: 'New York' },
  },
  {
    id: '8',
    title: 'International Film Festival',
    description:
      'A week-long celebration of global cinema with screenings and Q&A sessions.',
    location: 'Downtown Theater',
    createdAt: new Date('2025-02-10'),
    imageUrls: ['https://images.unsplash.com/photo-1515168833902-3acb99951a91'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1515168833902-3acb99951a91',
    startDateTime: new Date('2025-10-05T10:00:00'),
    endDateTime: new Date('2025-10-12T23:59:00'),
    isFree: false,
    url: 'https://filmfest2025.com',
    dressCode: 'CASUAL',
    idRequired: false,
    categoryId: '8',
    category: { id: '8', name: 'Film' },
    venueId: '8',
    venue: {
      id: '8',
      name: 'Downtown Theater',
      city: 'Toronto',
      latitude: '43.65107',
      longitude: '-79.347015',
    },
    tags: [
      { id: '15', name: 'Movies', color: '#FFD700' },
      { id: '16', name: 'Festival', color: '#800080' },
    ],
    attendeeLimit: 3000,
    featured: true,
    ticketTypes: [{ id: '6', name: 'VIP', price: 200 }],
    publishedStatus: 'PUBLISHED',
    cityId: '8',
    City: { id: '8', name: 'Toronto' },
  },
  {
    id: '9',
    title: 'Yoga & Wellness Retreat',
    description:
      'A relaxing weekend retreat focusing on yoga, meditation, and self-care.',
    location: 'Mountain Lodge',
    createdAt: new Date('2025-03-15'),
    imageUrls: ['https://images.unsplash.com/photo-1554320841-856d7d99b7b8'],
    coverImageUrl: 'https://images.unsplash.com/photo-1554320841-856d7d99b7b8',
    startDateTime: new Date('2025-11-20T08:00:00'),
    endDateTime: new Date('2025-11-22T18:00:00'),
    isFree: false,
    url: 'https://yogaretreat.com',
    dressCode: 'CASUAL',
    idRequired: false,
    categoryId: '9',
    category: { id: '9', name: 'Wellness' },
    venueId: '9',
    venue: {
      id: '9',
      name: 'Mountain Lodge',
      city: 'Denver',
      latitude: '39.7392',
      longitude: '-104.9903',
    },
    tags: [
      { id: '17', name: 'Yoga', color: '#00A86B' },
      { id: '18', name: 'Meditation', color: '#4682B4' },
    ],
    attendeeLimit: 150,
    featured: false,
    ticketTypes: [{ id: '7', name: 'Full Retreat', price: 500 }],
    publishedStatus: 'PUBLISHED',
    cityId: '9',
    City: { id: '9', name: 'Denver' },
  },
  {
    id: '10',
    title: 'Comic Book Expo',
    description:
      'Meet your favorite artists, writers, and cosplayers at this exciting expo.',
    location: 'Expo Center',
    createdAt: new Date('2025-01-20'),
    imageUrls: ['https://images.unsplash.com/photo-1579389083078-7c33c8aaca91'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1579389083078-7c33c8aaca91',
    startDateTime: new Date('2025-09-15T10:00:00'),
    endDateTime: new Date('2025-09-17T18:00:00'),
    isFree: false,
    url: 'https://comicexpo.com',
    dressCode: 'CASUAL',
    idRequired: false,
    categoryId: '10',
    category: { id: '10', name: 'Pop Culture' },
    venueId: '10',
    venue: {
      id: '10',
      name: 'Expo Center',
      city: 'Seattle',
      latitude: '47.6062',
      longitude: '-122.3321',
    },
    tags: [
      { id: '19', name: 'Comics', color: '#FF6347' },
      { id: '20', name: 'Cosplay', color: '#8A2BE2' },
    ],
    attendeeLimit: 5000,
    featured: true,
    ticketTypes: [{ id: '8', name: 'Weekend Pass', price: 120 }],
    publishedStatus: 'PUBLISHED',
    cityId: '10',
    City: { id: '10', name: 'Seattle' },
  },
  {
    id: '11',
    title: 'Marathon 2025',
    description: 'Join thousands of runners in this annual marathon challenge.',
    location: 'City Park',
    createdAt: new Date('2025-04-01'),
    imageUrls: ['https://images.unsplash.com/photo-1521336575822-6da63fb45455'],
    coverImageUrl:
      'https://images.unsplash.com/photo-1521336575822-6da63fb45455',
    startDateTime: new Date('2025-10-22T06:00:00'),
    endDateTime: new Date('2025-10-22T14:00:00'),
    isFree: false,
    url: 'https://marathon2025.com',
    dressCode: 'CASUAL',
    idRequired: true,
    categoryId: '11',
    category: { id: '11', name: 'Sports' },
    venueId: '11',
    venue: {
      id: '11',
      name: 'City Park',
      city: 'Boston',
      latitude: '42.3601',
      longitude: '-71.0589',
    },
    tags: [
      { id: '21', name: 'Running', color: '#FF4500' },
      { id: '22', name: 'Fitness', color: '#32CD32' },
    ],
    attendeeLimit: 20000,
    featured: true,
    ticketTypes: [{ id: '9', name: 'Standard Entry', price: 50 }],
    publishedStatus: 'PUBLISHED',
    cityId: '11',
    City: { id: '11', name: 'Boston' },
  },
  {
    id: '12',
    title: 'Science Fair 2025',
    description:
      'A showcase of the latest scientific discoveries and student projects.',
    location: 'Science Museum',
    createdAt: new Date('2025-02-18'),
    imageUrls: ['https://images.unsplash.com/photo-1557682250-33bd709cbe85'],
    coverImageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85',
    startDateTime: new Date('2025-11-10T09:00:00'),
    endDateTime: new Date('2025-11-12T17:00:00'),
    isFree: true,
    url: 'https://sciencefair2025.com',
    dressCode: 'CASUAL',
    idRequired: false,
    categoryId: '12',
    category: { id: '12', name: 'Education' },
    venueId: '12',
    venue: {
      id: '12',
      name: 'Science Museum',
      city: 'London',
      latitude: '51.5074',
      longitude: '-0.1278',
    },
    tags: [
      { id: '23', name: 'Science', color: '#00CED1' },
      { id: '24', name: 'Education', color: '#4682B4' },
    ],
    attendeeLimit: 500,
    featured: false,
    ticketTypes: [],
    publishedStatus: 'PUBLISHED',
    cityId: '12',
    City: { id: '12', name: 'London' },
  },
];

// Categories for filter
const categories: Category[] = [
  { id: '1', name: 'Music' },
  { id: '2', name: 'Technology' },
  { id: '3', name: 'Arts & Crafts' },
  { id: '4', name: 'Charity' },
  { id: '5', name: 'Sports' },
  { id: '6', name: 'Food & Drinks' },
  { id: '7', name: 'Business' },
  { id: '8', name: 'Education' },
];

// Event Card Component
interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const [isHovered, setIsHovered] = useState(false);
  const formattedDate = format(event.startDateTime, 'EEE, MMM d, yyyy');
  const formattedTime = format(event.startDateTime, 'h:mm a');
  const isFree = event.isFree;

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}k`;
    } else {
      return `₦${price}`;
    }
  };

  // Calculate min and max ticket prices with abbreviated format
  let ticketPrice = null;
  if (!isFree && event.ticketTypes && event.ticketTypes.length > 0) {
    const prices = event.ticketTypes.map((ticket) => ticket.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      ticketPrice = formatPrice(minPrice);
    } else {
      ticketPrice = `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    }
  }

  return (
    <Card
      className="h-full flex flex-col overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={
            event.coverImageUrl ||
            event.imageUrls[0] ||
            '/api/placeholder/400/300'
          }
          alt={event.title}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
        {/* Dark Layer */}
        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-all duration-300"></div>
        <div
          className={`absolute top-2 right-2 transition-transform duration-300 ${
            isHovered ? '-translate-y-10' : 'translate-x-0'
          }`}
        >
          {event.featured && <Badge className="bg-yellow-500">Featured</Badge>}
        </div>
        {event.category && (
          <Badge
            className="absolute top-2 left-2
        "
          >
            {event.category?.name}
          </Badge>
        )}
        <div
          className={`absolute top-2 right-2 flex justify-center space-x-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button className="">
            <Heart className="size-7 hover:text-primary text-white transition-all duration-300" />
          </button>
          <button>
            <Share2 className="size-7 hover:text-primary text-white transition-all duration-300" />
          </button>
        </div>
      </div>
      <CardHeader className="p-4 pb-0">
        <h3 className="text-lg font-semibold line-clamp-2">{event.title}</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <Clock className="h-4 w-4 mr-1" />
          <span>{formattedTime}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-grow">
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">
            {event.venue.name}, {event.venue.city}
          </span>
        </div>
        <div className="mt-2">
          {event.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="mr-1 mb-1"
              style={{ color: tag.color, borderColor: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <span className="font-semibold">
              {isFree ? 'Free' : `${ticketPrice}`}
            </span>
          </div>
          <Button size="sm" className="text-white">
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Filter Component
interface FilterComponentProps {
  onFilterChange: (filters: FilterState) => void;
}

const FilterComponent: React.FC<FilterComponentProps> = ({
  onFilterChange,
}) => {
  const [dateFilter, setDateFilter] = useState<string>('any');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleApplyFilters = () => {
    onFilterChange({
      date: dateFilter,
      price: priceFilter,
      priceRange: priceRange,
      categories: selectedCategories,
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter Events</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-6">
          <div>
            <h3 className="font-medium mb-2">Date</h3>
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Date</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-weekend">This Weekend</SelectItem>
                <SelectItem value="next-week">Next Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Price</h3>
            <div className="flex gap-4 mb-4">
              <Button
                variant={priceFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceFilter('all')}
              >
                All
              </Button>
              <Button
                variant={priceFilter === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceFilter('free')}
              >
                Free
              </Button>
              <Button
                variant={priceFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceFilter('paid')}
              >
                Paid
              </Button>
            </div>
            {priceFilter === 'paid' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span>₦{priceRange[0]}</span>
                    <span>₦{priceRange[1]}</span>
                  </div>
                  <Slider
                    defaultValue={priceRange}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => handleCategoryChange(category.id)}
                  />
                  <Label htmlFor={`category-${category.id}`}>
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDateFilter('any');
                setPriceFilter('all');
                setPriceRange([0, 1000]);
                setSelectedCategories([]);
              }}
            >
              Reset
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex justify-center mt-8 gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
};

// Main All Events Page Component
const AllEventsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<FilterState>({
    date: 'any',
    price: 'all',
    priceRange: [0, 1000],
    categories: [],
  });

  const eventsPerPage = 8;
  const totalPages = Math.ceil(sampleEvents.length / eventsPerPage);

  // Apply filters (simplified implementation)
  const filteredEvents = sampleEvents.filter((event) => {
    // Filter by price
    if (filters.price === 'free' && !event.isFree) return false;
    if (filters.price === 'paid' && event.isFree) return false;

    // Filter by price range for paid events
    if (filters.price === 'paid') {
      const eventPrice =
        event.ticketTypes && event.ticketTypes.length > 0
          ? event.ticketTypes[0].price
          : 0;
      if (
        eventPrice < filters.priceRange[0] ||
        eventPrice > filters.priceRange[1]
      )
        return false;
    }

    // Filter by category
    if (filters.categories.length > 0) {
      if (!event.categoryId || !filters.categories.includes(event.categoryId))
        return false;
    }

    // Filter by date (simplified implementation)
    if (filters.date !== 'any') {
      const today = new Date();
      const eventDate = new Date(event.startDateTime);

      if (filters.date === 'this-week') {
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        if (eventDate < today || eventDate > endOfWeek) return false;
      } else if (filters.date === 'this-weekend') {
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (6 - today.getDay()));
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        if (!(eventDate >= saturday && eventDate <= sunday)) return false;
      } else if (filters.date === 'next-week') {
        const startOfNextWeek = new Date(today);
        startOfNextWeek.setDate(today.getDate() + (7 - today.getDay() + 1));
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
        if (!(eventDate >= startOfNextWeek && eventDate <= endOfNextWeek))
          return false;
      }
    }

    return true;
  });

  // Paginate events
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(
    indexOfFirstEvent,
    indexOfLastEvent
  );

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  return (
    <div>
      <PagesHero
        header="All Events"
        text='"Discover, Experience, and Celebrate All Events in One Place!"'
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">All Events</h1>
          <FilterComponent onFilterChange={handleFilterChange} />
        </div>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No events found</h2>
            <p className="text-gray-500">
              Try adjusting your filters to find more events.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllEventsPage;
