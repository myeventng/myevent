import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  ExternalLink,
  Star,
} from 'lucide-react';
import { getEventBySlug } from '@/actions/event.actions';
import { getEventRatings } from '@/actions/rating.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { CompactRating } from '@/components/ui/ratings-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EventTicketBooking } from '@/components/events/clientside/event-ticket-booking';
import { EventGallery } from '@/components/events/clientside/event-gallery';
import { EventReviews } from '@/components/events/clientside/event-reviews';
import { ShareEventButton } from '@/components/events/clientside/share-event-button';
import Image from 'next/image';

interface EventPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const response = await getEventBySlug(params.slug);

  if (!response.success || !response.data) {
    return {
      title: 'Event Not Found',
    };
  }

  const event = response.data;

  // Get ratings for better SEO
  const ratingsResponse = await getEventRatings(event.id, 1, 5);
  const averageRating =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.averageRating
      : 0;
  const ratingsCount =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.totalCount
      : 0;

  const description = event.description
    ? `${event.description.slice(0, 160)}...`
    : `Join us for ${event.title}! ${
        ratingsCount > 0
          ? `Rated ${averageRating}/5 stars by ${ratingsCount} attendees.`
          : ''
      }`;

  return {
    title: `${event.title} | ${format(
      new Date(event.startDateTime),
      'MMM d, yyyy'
    )}`,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : [],
    },
    other: {
      // Add structured data for events
      'event:start_time': event.startDateTime,
      'event:end_time': event.endDateTime,
      'event:location': `${event.venue.name}, ${event.venue.address}`,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const response = await getEventBySlug(params.slug);

  if (!response.success || !response.data) {
    notFound();
  }

  const event = response.data;

  // Check if event is published and not cancelled
  if (event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
    notFound();
  }

  // Get initial ratings data
  const ratingsResponse = await getEventRatings(event.id, 1, 5);
  const initialRatings =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.ratings
      : [];

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'PPP p');
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'p');
  };

  const isEventPast = new Date(event.endDateTime) < new Date();
  const availableTickets = event.ticketTypes.reduce(
    (sum: number, type: any) => sum + type.quantity,
    0
  );

  // Calculate average rating for display
  const averageRating =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.averageRating
      : 0;
  const ratingsCount =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.totalCount
      : 0;

  return (
    <div className="min-h-screen bg-blue-">
      {/* Hero Section */}
      <div className="relative">
        {event.coverImageUrl && (
          <div className="aspect-[21/9] w-full overflow-hidden">
            <Image
              fill
              priority
              quality={100}
              unoptimized
              sizes="100vw"
              src={event.coverImageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          </div>
        )}
        <div className="absolute bottom-5 left-0 right-0 p-6 text-white">
          <div className="container mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-lg mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>{formatDateTime(event.startDateTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{event.venue.name}</span>
                  </div>
                  {ratingsCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span>
                        {averageRating.toFixed(1)} ({ratingsCount} reviews)
                      </span>
                    </div>
                  )}
                </div>
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag: any) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        style={{ backgroundColor: tag.bgColor }}
                        className="text-white"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {event.featured && (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-500/20 text-yellow-100 border-yellow-500/30"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Featured
                  </Badge>
                )}
                <ShareEventButton event={event} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {event.description ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No description provided for this event.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startDateTime), 'PPP')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(event.startDateTime)} -{' '}
                        {formatTime(event.endDateTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Venue</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue.address}
                      </p>
                      {event.venue.city && (
                        <p className="text-sm text-muted-foreground">
                          {event.venue.city.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {event.attendeeLimit && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-sm text-muted-foreground">
                          {event.attendeeLimit} attendees
                        </p>
                      </div>
                    </div>
                  )}

                  {event.age && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Age Restriction</p>
                        <p className="text-sm text-muted-foreground">
                          {(event.age as string)
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.dressCode && (
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Dress Code</p>
                        <p className="text-sm text-muted-foreground">
                          {(event.dressCode as string)
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {event.lateEntry && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Late entry allowed until {formatTime(event.lateEntry)}
                    </p>
                  </div>
                )}

                {event.idRequired && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Valid ID required for entry
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image Gallery */}
            {event.imageUrls && event.imageUrls.length > 0 && (
              <EventGallery images={event.imageUrls} title={event.title} />
            )}

            {/* Embedded Video */}
            {event.embeddedVideoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <iframe
                      src={event.embeddedVideoUrl}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {event.user?.image && (
                    <Image
                      width={48}
                      height={48}
                      unoptimized
                      quality={100}
                      src={event.user.image}
                      alt={event.user.name || 'Organizer'}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    {event.user?.organizerProfile ? (
                      <>
                        <h4 className="font-semibold">
                          {event.user.organizerProfile.organizationName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {event.user.name}
                        </p>
                        {event.user.organizerProfile.bio && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.user.organizerProfile.bio}
                          </p>
                        )}
                      </>
                    ) : (
                      <h4 className="font-semibold">
                        {event.user?.name || 'Unknown Organizer'}
                      </h4>
                    )}
                  </div>
                </div>

                {event.user?.organizerProfile?.website && (
                  <Separator className="my-4" />
                )}

                {event.user?.organizerProfile?.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a
                      href={event.user.organizerProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Event URL */}
            {event.url && (
              <Card>
                <CardHeader>
                  <CardTitle>More Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Event Website
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Event Reviews - Updated Component */}
            <EventReviews
              eventId={event.id}
              eventTitle={event.title}
              initialRatings={initialRatings}
              isPastEvent={isEventPast}
            />
          </div>

          {/* Right Column - Booking & Organizer Info */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <span className="text-sm font-medium">
                    {event.category?.name || 'Uncategorized'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Price Range
                  </span>
                  <span className="text-sm font-medium">
                    {event.isFree
                      ? 'Free'
                      : event.ticketTypes.length > 0
                      ? `₦${Math.min(
                          ...event.ticketTypes.map((t: any) => t.price)
                        )} - ₦${Math.max(
                          ...event.ticketTypes.map((t: any) => t.price)
                        )}`
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Available Tickets
                  </span>
                  <span className="text-sm font-medium">
                    {availableTickets} remaining
                  </span>
                </div>

                {ratingsCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Rating
                    </span>
                    <span className="text-sm font-medium">
                      {averageRating.toFixed(1)}/5 ({ratingsCount} reviews)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Booking */}
            {!isEventPast && availableTickets > 0 && (
              <EventTicketBooking
                event={event}
                ticketTypes={event.ticketTypes}
              />
            )}

            {/* Event Status Messages */}
            {isEventPast && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Event Has Ended</h3>
                  <p className="text-sm text-muted-foreground">
                    This event took place on{' '}
                    {format(new Date(event.startDateTime), 'PPP')}
                  </p>
                  {ratingsCount > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(averageRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-muted stroke-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {averageRating.toFixed(1)} ({ratingsCount} reviews)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isEventPast && availableTickets === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Sold Out</h3>
                  <p className="text-sm text-muted-foreground">
                    All tickets for this event have been sold.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
