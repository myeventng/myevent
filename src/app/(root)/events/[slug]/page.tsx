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
  Trophy,
  Vote,
} from 'lucide-react';
import { getEventBySlug } from '@/actions/event.actions';
import { getEventRatings } from '@/actions/rating.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EventTicketBooking } from '@/components/events/clientside/event-ticket-booking';
import { VotingContestComponent } from '@/components/voting/voting-contest-component';
import { EventGallery } from '@/components/events/clientside/event-gallery';
import { EventReviews } from '@/components/events/clientside/event-reviews';
import { ShareEventButton } from '@/components/events/clientside/share-event-button';
import { EventType } from '@/generated/prisma';
import Image from 'next/image';

interface EventPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;
  const response = await getEventBySlug(slug);

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

  const isVotingContest = event.eventType === EventType.VOTING_CONTEST;

  let description = event.description
    ? `${event.description.slice(0, 160)}...`
    : `${isVotingContest ? 'Vote in' : 'Join us for'} ${event.title}! ${
        ratingsCount > 0
          ? `Rated ${averageRating}/5 stars by ${ratingsCount} ${isVotingContest ? 'participants' : 'attendees'}.`
          : ''
      }`;

  if (isVotingContest && event.votingContest) {
    description = `Vote for your favorite contestant in ${event.title}! ${event.votingContest.contestants?.length || 0} contestants competing.`;
  }

  return {
    title: `${event.title} ${isVotingContest ? '| Voting Contest' : ''} | ${format(
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
      'event:type': event.eventType,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const response = await getEventBySlug(slug);

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
  const isVotingContest = event.eventType === EventType.VOTING_CONTEST;

  // For voting contests, check if voting period is active
  const isVotingActive =
    isVotingContest &&
    event.votingContest &&
    (!event.votingContest.votingStartDate ||
      new Date() >= new Date(event.votingContest.votingStartDate)) &&
    (!event.votingContest.votingEndDate ||
      new Date() <= new Date(event.votingContest.votingEndDate));

  const availableTickets = isVotingContest
    ? 0
    : event.ticketTypes?.reduce(
        (sum: number, type: any) => sum + type.quantity,
        0
      ) || 0;

  // Calculate average rating for display
  const averageRating =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.averageRating
      : 0;
  const ratingsCount =
    ratingsResponse.success && ratingsResponse.data
      ? ratingsResponse.data.totalCount
      : 0;

  const getEventTypeIcon = () => {
    switch (event.eventType) {
      case EventType.VOTING_CONTEST:
        return <Trophy className="h-5 w-5" />;
      case EventType.INVITE:
        return <Users className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getEventTypeBadge = () => {
    switch (event.eventType) {
      case EventType.VOTING_CONTEST:
        return (
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-800 border-purple-300"
          >
            <Trophy className="h-3 w-3 mr-1" />
            Voting Contest
          </Badge>
        );
      case EventType.INVITE:
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 border-blue-300"
          >
            <Users className="h-3 w-3 mr-1" />
            Invite Only
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Shoobs Style */}
      <div className="relative bg-black">
        {/* Background overlay image */}
        {event.coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image
              fill
              priority
              quality={100}
              unoptimized
              sizes="100vw"
              src={event.coverImageUrl}
              alt=""
              className="h-full w-full object-cover blur-sm"
            />
          </div>
        )}

        {/* Content container */}
        <div className="relative container mx-auto px-4 py-8 md:py-12">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Featured Image */}
            <div className="w-full">
              {event.imageUrls && event.imageUrls[0] ? (
                <div className="aspect-[4/3] md:aspect-square overflow-hidden rounded-lg shadow-2xl">
                  <Image
                    width={600}
                    height={600}
                    unoptimized
                    priority
                    quality={100}
                    src={event.imageUrls[0]}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : event.coverImageUrl ? (
                <div className="aspect-[4/3] md:aspect-square overflow-hidden rounded-lg shadow-2xl">
                  <Image
                    width={600}
                    height={600}
                    unoptimized
                    priority
                    quality={100}
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] md:aspect-square bg-gray-800 rounded-lg shadow-2xl flex items-center justify-center">
                  <Calendar className="h-24 w-24 text-gray-600" />
                </div>
              )}
            </div>

            {/* Right: Event Details */}
            <div className="text-white space-y-6">
              {/* Event Type Badge */}
              <div className="flex items-center gap-2">
                {getEventTypeBadge()}
                {event.featured && (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-500/20 text-yellow-100 border-yellow-500/30"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-start gap-3 mb-3">
                  {getEventTypeIcon()}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                    {event.title}
                  </h1>
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Date & Time</p>
                    <p className="text-gray-300">
                      {format(
                        new Date(event.startDateTime),
                        'EEEE, MMMM d, yyyy'
                      )}
                    </p>
                    <p className="text-gray-300">
                      {formatTime(event.startDateTime)} -{' '}
                      {formatTime(event.endDateTime)}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Location</p>
                    <p className="text-gray-300">{event.venue.name}</p>
                    <p className="text-gray-300">{event.venue.address}</p>
                    {event.venue.city && (
                      <p className="text-gray-300">{event.venue.city.name}</p>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {ratingsCount > 0 && (
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Rating</p>
                      <p className="text-gray-300">
                        {averageRating.toFixed(1)}/5 ({ratingsCount} reviews)
                      </p>
                    </div>
                  </div>
                )}

                {/* Voting Stats */}
                {isVotingContest && event.votingContest && (
                  <div className="flex items-center gap-3">
                    <Vote className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Votes Cast</p>
                      <p className="text-gray-300">
                        {event.votingContest._count?.votes || 0} votes
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
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

              {/* Share Button */}
              <div className="pt-4">
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
            {/* Voting Status Alert for Voting Contests */}
            {isVotingContest && event.votingContest && (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-900">
                        {isVotingActive ? 'Voting is Live!' : 'Voting Contest'}
                      </h3>
                      <p className="text-purple-700">
                        {isVotingActive
                          ? 'Cast your vote for your favorite contestant below'
                          : event.votingContest.votingStartDate &&
                              new Date() <
                                new Date(event.votingContest.votingStartDate)
                            ? `Voting starts ${format(new Date(event.votingContest.votingStartDate), 'PPP p')}`
                            : 'Voting has ended'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isVotingContest ? 'About This Contest' : 'About This Event'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {event.description ? (
                    <p className="text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No description provided for this{' '}
                      {isVotingContest ? 'contest' : 'event'}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voting Contest Component */}
            {isVotingContest && event.votingContest && (
              <VotingContestComponent
                event={event}
                votingContest={event.votingContest}
                isVotingActive={isVotingActive}
              />
            )}

            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isVotingContest ? 'Contest Details' : 'Event Details'}
                </CardTitle>
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

                  {/* Voting-specific details */}
                  {isVotingContest && event.votingContest && (
                    <>
                      {event.votingContest.votingStartDate && (
                        <div className="flex items-center gap-3">
                          <Vote className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Voting Period</p>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(event.votingContest.votingStartDate),
                                'PPP p'
                              )}
                              {event.votingContest.votingEndDate && (
                                <span>
                                  {' '}
                                  -{' '}
                                  {format(
                                    new Date(event.votingContest.votingEndDate),
                                    'PPP p'
                                  )}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Contestants</p>
                          <p className="text-sm text-muted-foreground">
                            {event.votingContest.contestants?.length || 0}{' '}
                            contestants competing
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Voting Type</p>
                          <p className="text-sm text-muted-foreground">
                            {event.votingContest.votingType === 'FREE'
                              ? 'Free Voting'
                              : 'Paid Voting'}
                            {event.votingContest.allowGuestVoting &&
                              ' (Guests allowed)'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Standard event details */}
                  {!isVotingContest && (
                    <>
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
                                .replace(/\b\w/g, (l: string) =>
                                  l.toUpperCase()
                                )}
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
                                .replace(/\b\w/g, (l: string) =>
                                  l.toUpperCase()
                                )}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isVotingContest && event.lateEntry && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Late entry allowed until {formatTime(event.lateEntry)}
                    </p>
                  </div>
                )}

                {!isVotingContest && event.idRequired && (
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
                  <CardTitle>
                    {isVotingContest ? 'Contest Preview' : 'Event Preview'}
                  </CardTitle>
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
                      {isVotingContest ? 'Contest Website' : 'Event Website'}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Event Reviews */}
            <EventReviews
              eventId={event.id}
              eventTitle={event.title}
              initialRatings={initialRatings}
              isPastEvent={isEventPast}
              isVotingContest={isVotingContest}
            />
          </div>

          {/* Right Column - Booking/Voting & Quick Info */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">
                    {event.eventType === EventType.VOTING_CONTEST
                      ? 'Voting Contest'
                      : event.eventType === EventType.INVITE
                        ? 'Invite Only'
                        : 'Standard Event'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <span className="text-sm font-medium">
                    {event.category?.name || 'Uncategorized'}
                  </span>
                </div>

                {!isVotingContest && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Price Range
                      </span>
                      <span className="text-sm font-medium">
                        {event.isFree
                          ? 'Free'
                          : event.ticketTypes && event.ticketTypes.length > 0
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
                  </>
                )}

                {isVotingContest && event.votingContest && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Contestants
                      </span>
                      <span className="text-sm font-medium">
                        {event.votingContest.contestants?.length || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Votes
                      </span>
                      <span className="text-sm font-medium">
                        {event.votingContest._count?.votes || 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Voting Status
                      </span>
                      <span className="text-sm font-medium">
                        {isVotingActive ? 'Live' : 'Ended'}
                      </span>
                    </div>
                  </>
                )}

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

            {/* Ticket Booking for Standard Events */}
            {!isVotingContest && !isEventPast && availableTickets > 0 && (
              <EventTicketBooking
                event={event}
                ticketTypes={event.ticketTypes || []}
              />
            )}

            {/* Event Status Messages */}
            {isEventPast && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">
                    {isVotingContest ? 'Contest Has Ended' : 'Event Has Ended'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This {isVotingContest ? 'contest' : 'event'} took place on{' '}
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

            {!isVotingContest && !isEventPast && availableTickets === 0 && (
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
