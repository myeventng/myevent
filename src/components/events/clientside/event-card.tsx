'use client';

import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Vote,
  Crown,
} from 'lucide-react';
import { format } from 'date-fns';
import { CompactRating } from '@/components/ui/ratings-display';
import { EventType } from '@/generated/prisma';
import { EventImage } from '@/components/brand/event-image';
import Link from 'next/link';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    eventType: EventType;
    startDateTime: string;
    endDateTime: string;
    coverImageUrl?: string;
    mobileImageUrl?: string | null;
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

  const getPrimaryActionText = () => {
    if (isEventPast) return 'View details';
    switch (event.eventType) {
      case EventType.VOTING_CONTEST:
        return isVotingActive ? 'Vote now' : 'View contest';
      case EventType.INVITE:
        return 'View details';
      default:
        return 'Book now';
    }
  };

  const image = event.imageUrls?.[0] || event.coverImageUrl;

  const priceLabel = isVotingContest
    ? event.votingContest?.votingType === 'FREE'
      ? 'Free voting'
      : 'Paid voting'
    : isInviteOnly
      ? 'Invite only'
      : event.isFree
        ? 'Free'
        : `From ₦${minPrice.toLocaleString()}`;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="me-card group flex h-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--me-raised)] sm:aspect-[16/11]">
        {image ? (
          <EventImage
            unoptimized
            src={image}
            mobileSrc={event.mobileImageUrl}
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Calendar className="h-12 w-12 text-[var(--me-line)]" aria-hidden="true" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {event.category && (
            <span className="rounded-full bg-[var(--me-bg-deep)] px-3 py-1 text-xs font-semibold text-white">
              {event.category.name}
            </span>
          )}
          {isVotingContest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--me-violet)] px-3 py-1 text-xs font-semibold text-white">
              <Trophy className="h-3 w-3" aria-hidden="true" /> Contest
            </span>
          )}
          {isInviteOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--me-magenta)] px-3 py-1 text-xs font-semibold text-white">
              <Users className="h-3 w-3" aria-hidden="true" /> Invite only
            </span>
          )}
        </div>

        {isVotingContest && isVotingActive && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--me-red)] px-3 py-1 text-xs font-bold text-white">
            <Vote className="h-3 w-3" aria-hidden="true" /> Voting live
          </span>
        )}
        {event.featured && !(isVotingContest && isVotingActive) && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--me-red)] px-3 py-1 text-xs font-bold text-white">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="text-sm font-semibold text-[var(--me-red-text)]">
          {format(new Date(event.startDateTime), 'EEE d MMM, h:mm a')}
        </p>
        <h3 className="font-display line-clamp-2 text-xl font-bold leading-snug text-white">
          {event.title}
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-[var(--me-muted)]">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {event.venue.name}
            {event.venue.city && `, ${event.venue.city.name}`}
          </span>
        </p>

        {event.averageRating && event.ratingsCount ? (
          <CompactRating rating={event.averageRating} count={event.ratingsCount} />
        ) : null}

        {isVotingContest && event.votingContest && (
          <div className="space-y-1 text-sm text-[var(--me-muted)]">
            <p className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              {totalContestants} contestants, {totalVotes.toLocaleString()} votes
            </p>
            {topContestant && (
              <p className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-[var(--me-orange)]" aria-hidden="true" />
                <span className="line-clamp-1">
                  Leading: {topContestant.name}
                </span>
              </p>
            )}
            {!isVotingActive &&
              !isEventPast &&
              event.votingContest.votingStartDate && (
                <p className="flex items-center gap-1.5 text-white">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Voting starts{' '}
                  {format(new Date(event.votingContest.votingStartDate), 'd MMM')}
                </p>
              )}
          </div>
        )}

        {!isVotingContest && isEventPast && (
          <p className="flex items-center gap-1.5 text-sm text-white">
            <Clock className="h-4 w-4" aria-hidden="true" /> Event ended
          </p>
        )}

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-[var(--me-line)] px-2.5 py-0.5 text-xs text-[var(--me-muted)]"
              >
                {tag.name}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="rounded-full border border-[var(--me-line)] px-2.5 py-0.5 text-xs text-[var(--me-muted)]">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="text-base font-bold text-white">{priceLabel}</span>
          <span
            className={`rounded-full px-4 py-2 text-sm font-bold text-white ${
              isEventPast
                ? 'border-2 border-[var(--me-line)]'
                : 'bg-[var(--me-red)]'
            }`}
          >
            {getPrimaryActionText()}
          </span>
        </div>
      </div>
    </Link>
  );
}
