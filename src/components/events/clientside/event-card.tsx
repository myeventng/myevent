'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Vote,
  Crown,
  Medal,
} from 'lucide-react';
import { format } from 'date-fns';
import { CompactRating } from '@/components/ui/ratings-display';
import { EventType } from '@/generated/prisma';
import Image from 'next/image';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    eventType: EventType;
    startDateTime: string;
    endDateTime: string;
    coverImageUrl?: string;
    imageUrls: string[];
    isFree: boolean;
    venue: {
      name: string;
      city?: { name: string };
    };
    ticketTypes: { price: number }[];
    category?: { name: string };
    tags: { id: string; name: string; bgColor: string }[];
    averageRating?: number;
    ratingsCount?: number;
    featured?: boolean;
    // Voting contest specific fields
    votingContest?: {
      contestants: Array<{
        id: string;
        name: string;
        _count?: { votes: number };
      }>;
      _count?: { votes: number };
      votingType: 'FREE' | 'PAID';
      votingStartDate?: string;
      votingEndDate?: string;
    };
  };
}

export function EventCard({ event }: EventCardProps) {
  const isEventPast = new Date(event.endDateTime) < new Date();
  const isVotingContest = event.eventType === EventType.VOTING_CONTEST;
  const isInviteOnly = event.eventType === EventType.INVITE;

  // For voting contests, check if voting is active
  const isVotingActive =
    isVotingContest &&
    event.votingContest &&
    (!event.votingContest.votingStartDate ||
      new Date() >= new Date(event.votingContest.votingStartDate)) &&
    (!event.votingContest.votingEndDate ||
      new Date() <= new Date(event.votingContest.votingEndDate)) &&
    !isEventPast;

  // Price calculation for standard events
  const minPrice = event.isFree
    ? 0
    : Math.min(...event.ticketTypes.map((t) => t.price));

  // Get voting contest stats
  const totalVotes = event.votingContest?._count?.votes || 0;
  const totalContestants = event.votingContest?.contestants?.length || 0;
  const topContestant = event.votingContest?.contestants?.reduce(
    (prev, current) =>
      (current._count?.votes || 0) > (prev._count?.votes || 0) ? current : prev
  );

  const getEventTypeIcon = () => {
    switch (event.eventType) {
      case EventType.VOTING_CONTEST:
        return <Trophy className="h-4 w-4" />;
      case EventType.INVITE:
        return <Users className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
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
            Contest
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

  const getPrimaryActionText = () => {
    if (isEventPast) return 'View Details';

    switch (event.eventType) {
      case EventType.VOTING_CONTEST:
        return isVotingActive ? 'Vote Now' : 'View Contest';
      case EventType.INVITE:
        return 'View Details';
      default:
        return 'Book Now';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Image */}
      {event.coverImageUrl && (
        <div className="aspect-[16/9] overflow-hidden relative">
          <Image
            width={800}
            height={450}
            unoptimized
            priority
            quality={90}
            src={event.imageUrls[0] || event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />

          {/* Overlay badges for voting contests */}
          {isVotingContest && isVotingActive && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500 text-white border-red-600 animate-pulse">
                <Vote className="h-3 w-3 mr-1" />
                Live Voting
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Event Type and Featured Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {event.category && (
              <Badge variant="secondary" className="text-xs">
                {event.category.name}
              </Badge>
            )}
            {getEventTypeBadge()}
          </div>
          {event.featured && (
            <Badge
              variant="outline"
              className="text-xs border-yellow-500 text-yellow-600"
            >
              Featured
            </Badge>
          )}
        </div>

        {/* Title and Rating */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {getEventTypeIcon()}
            <h3 className="font-semibold text-lg line-clamp-2 flex-1">
              {event.title}
            </h3>
          </div>

          {/* Rating Display */}
          {event.averageRating && event.ratingsCount && (
            <CompactRating
              rating={event.averageRating}
              count={event.ratingsCount}
            />
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.startDateTime), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">
              {event.venue.name}
              {event.venue.city && `, ${event.venue.city.name}`}
            </span>
          </div>

          {/* Voting Contest Specific Info */}
          {isVotingContest && event.votingContest && (
            <>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>{totalContestants} contestants competing</span>
              </div>

              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4" />
                <span>{totalVotes.toLocaleString()} total votes</span>
              </div>

              {topContestant && (
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="line-clamp-1">
                    Leading: {topContestant.name} (
                    {topContestant._count?.votes || 0} votes)
                  </span>
                </div>
              )}

              {!isVotingActive &&
                !isEventPast &&
                event.votingContest.votingStartDate && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Voting starts{' '}
                      {format(
                        new Date(event.votingContest.votingStartDate),
                        'MMM d'
                      )}
                    </span>
                  </div>
                )}
            </>
          )}

          {/* Standard Event Info */}
          {!isVotingContest && isEventPast && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span>Event Ended</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: tag.bgColor + '20',
                  borderColor: tag.bgColor,
                  color: tag.bgColor,
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{event.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Price/Action Section */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-lg font-semibold">
            {isVotingContest ? (
              <span className="text-purple-600">
                {event.votingContest?.votingType === 'FREE'
                  ? 'Free Voting'
                  : 'Paid Voting'}
              </span>
            ) : isInviteOnly ? (
              <span className="text-blue-600">Invite Only</span>
            ) : event.isFree ? (
              'Free'
            ) : (
              `From ₦${minPrice.toLocaleString()}`
            )}
          </div>

          <Button
            size="sm"
            variant={
              isEventPast
                ? 'outline'
                : isVotingContest && isVotingActive
                  ? 'default'
                  : isVotingContest
                    ? 'outline'
                    : 'default'
            }
            className={
              isVotingContest && isVotingActive
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : ''
            }
            asChild
          >
            <a href={`/events/${event.slug}`}>
              {isVotingContest && isVotingActive && (
                <Vote className="h-4 w-4 mr-1" />
              )}
              {getPrimaryActionText()}
            </a>
          </Button>
        </div>

        {/* Voting Contest Status Indicator */}
        {isVotingContest && (
          <div className="text-xs text-center">
            {isVotingActive ? (
              <span className="text-green-600 font-medium">
                🔴 Voting is live!
              </span>
            ) : isEventPast ? (
              <span className="text-gray-600">Contest ended</span>
            ) : event.votingContest?.votingStartDate &&
              new Date() < new Date(event.votingContest.votingStartDate) ? (
              <span className="text-blue-600">Voting opens soon</span>
            ) : (
              <span className="text-gray-600">Voting closed</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
