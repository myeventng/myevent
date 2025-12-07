'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  MapPin,
  Calendar,
  Clock,
  Tag,
  Armchair,
  Info,
  Ticket,
  User,
  Vote,
  Instagram,
  Twitter,
  Facebook,
  DollarSign,
  Package,
  Globe,
  UserCheck,
  AlertCircle,
  Mail,
  Users,
  Gift,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategories } from '@/actions/category-actions';
import { getTags } from '@/actions/tag.actions';
import { getVenueById } from '@/actions/venue-actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventType } from '@/generated/prisma';
import { getPlatformFee } from '@/lib/platform-settings';

interface EventPreviewProps {
  formData: any;
  ticketTypes: any[];
  onPrevious: () => void;
  onSubmit: (publishStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED') => void;
  isSubmitting: boolean;
  isEditing?: boolean;
  userRole?: string;
  userSubRole?: string;
}

export function EventPreview({
  formData,
  ticketTypes,
  onPrevious,
  onSubmit,
  isSubmitting,
  isEditing = false,
  userRole = 'USER',
  userSubRole = 'ORDINARY',
}: EventPreviewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [category, setCategory] = useState<any>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [venue, setVenue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platformFeePercentage, setPlatformFeePercentage] = useState(5);
  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isInviteOnly = formData.eventType === EventType.INVITE;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

  // Load platform fee
  useEffect(() => {
    const loadPlatformFee = async () => {
      try {
        const fee = await getPlatformFee();
        setPlatformFeePercentage(fee);
      } catch (error) {
        console.error('Error loading platform fee:', error);
      }
    };

    loadPlatformFee();
  }, []);

  // Fetch associated data for preview
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch category if available
        if (formData.categoryId) {
          const categoriesResponse = await getCategories();
          if (categoriesResponse.success && categoriesResponse.data) {
            const foundCategory = categoriesResponse.data.find(
              (cat: any) => cat.id === formData.categoryId
            );
            if (foundCategory) {
              setCategory(foundCategory);
            }
          }
        }

        // Fetch tags
        if (formData.tagIds && formData.tagIds.length > 0) {
          const tagsResponse = await getTags();
          if (tagsResponse.success && tagsResponse.data) {
            const selectedTags = tagsResponse.data.filter((tag: any) =>
              formData.tagIds.includes(tag.id)
            );
            setTags(selectedTags);
          }
        }

        // Fetch venue
        if (formData.venueId) {
          if (
            formData.venueId === 'online-venue-id' ||
            formData.venueId === 'online'
          ) {
            // Handle online venue
            setVenue({
              id: 'online-venue-id',
              name: 'Online Event',
              address: 'Virtual/Online',
              city: { name: 'Online', state: 'Virtual' },
              isOnline: true,
            });
          } else {
            const venueResponse = await getVenueById(formData.venueId);
            if (venueResponse.success && venueResponse.data) {
              setVenue(venueResponse.data);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching preview data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate platform fee using dynamic percentage
  const calculatePlatformFee = (amount: number) => {
    return (amount * platformFeePercentage) / 100;
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Format date and time
  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'PPP p');
  };

  // Calculate total tickets available (for standard events)
  const totalTickets = ticketTypes.reduce(
    (sum, ticket) => sum + ticket.quantity,
    0
  );

  // Get voting contest data
  const votingContest = formData.votingContest || {};
  const votePackages = votingContest.votePackages || [];
  const hasDefaultPrice =
    votingContest.defaultVotePrice && votingContest.defaultVotePrice > 0;

  // Get invite-only data
  const inviteOnly = formData.inviteOnly || {};
  const guests = formData.guests || [];
  const totalPlusOnes = guests.reduce((sum: number, g: any) => sum + (g.plusOnesAllowed || 0), 0);

  // Check if user can publish directly
  const canPublishDirectly =
    userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  // Get event type label
  const getEventTypeLabel = () => {
    if (isVotingContest) return 'Contest';
    if (isInviteOnly) return 'Invite-Only Event';
    return 'Event';
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {isVotingContest ? (
            <Vote className="h-6 w-6 text-primary" />
          ) : isInviteOnly ? (
            <Mail className="h-6 w-6 text-primary" />
          ) : (
            <Calendar className="h-6 w-6 text-primary" />
          )}
          <h2 className="text-2xl font-bold">{getEventTypeLabel()} Preview</h2>
        </div>
        <p className="text-muted-foreground">
          {isEditing
            ? `Review your updated ${getEventTypeLabel().toLowerCase()} details before saving.`
            : `Review your ${getEventTypeLabel().toLowerCase()} details before submitting for review.`}
        </p>

        {/* Admin Review Notice for Voting Contests */}
        {isVotingContest && !canPublishDirectly && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">
                  Admin Review Required
                </h4>
                <p className="text-sm text-blue-800 mt-1">
                  Voting contests require admin approval before being published.
                  Your contest will be submitted for review and you&apos;ll be
                  notified once it&apos;s approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice for Invite-Only Events */}
        {isInviteOnly && inviteOnly.isPrivate && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Private Event</h4>
                <p className="text-sm text-purple-800 mt-1">
                  This is a private invite-only event. Only invited guests will be able to
                  view event details and RSVP.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Cover image */}
        <div className="relative h-64">
          {formData.coverImageUrl ? (
            <Image
              src={formData.coverImageUrl}
              alt={formData.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">No cover image</p>
            </div>
          )}
          {isVotingContest && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-blue-600 text-white">
                <Vote className="h-3 w-3 mr-1" />
                Voting Contest
              </Badge>
            </div>
          )}
          {isInviteOnly && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-purple-600 text-white">
                <Mail className="h-3 w-3 mr-1" />
                Invite Only
              </Badge>
            </div>
          )}
        </div>

        <div className="p-6">
          <h1 className="text-3xl font-bold">{formData.title}</h1>

          <div className="flex flex-wrap gap-2 mt-3">
            {category && (
              <Badge variant="outline" className="bg-primary/10">
                {category.name}
              </Badge>
            )}
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                style={{
                  backgroundColor: tag.bgColor,
                  color: 'white',
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {isVotingContest ? 'Contest Period' : isInviteOnly ? 'Event Date' : 'Date & Time'}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDateTime(formData.startDateTime)} -{' '}
                    {formatDateTime(formData.endDateTime)}
                  </p>
                  {formData.lateEntry && !isVotingContest && !isInviteOnly && (
                    <p className="text-sm text-amber-600">
                      Late entry until: {formatDateTime(formData.lateEntry)}
                    </p>
                  )}
                  {isVotingContest && votingContest.votingStartDate && (
                    <p className="text-sm text-blue-600">
                      Voting: {formatDateTime(votingContest.votingStartDate)}
                      {votingContest.votingEndDate &&
                        ` - ${formatDateTime(votingContest.votingEndDate)}`}
                    </p>
                  )}
                  {isInviteOnly && inviteOnly.rsvpDeadline && (
                    <p className="text-sm text-purple-600">
                      RSVP by: {formatDateTime(inviteOnly.rsvpDeadline)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                {venue?.isOnline ? (
                  <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{venue?.name}</p>
                  <p className="text-muted-foreground">{venue?.address}</p>
                  {!venue?.isOnline && (
                    <p className="text-muted-foreground">
                      {venue?.city?.name}, {venue?.city?.state}
                    </p>
                  )}
                  {formData.location && (
                    <p className="text-sm mt-1">{formData.location}</p>
                  )}
                </div>
              </div>

              {isVotingContest ? (
                <div className="flex items-start gap-3">
                  <Vote className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Voting Type</p>
                    <p className="text-muted-foreground">
                      {votingContest.votingType === 'PAID'
                        ? 'Paid Voting'
                        : 'Free Voting'}
                    </p>
                    {votingContest.allowGuestVoting && (
                      <p className="text-sm text-purple-600">
                        Guest voting allowed (no account required)
                      </p>
                    )}
                    {votingContest.votingType === 'PAID' && (
                      <div className="mt-2">
                        {votingContest.votePackagesEnabled &&
                          votePackages.length > 0 ? (
                          <p className="text-sm text-blue-600">
                            {votePackages.length} vote package
                            {votePackages.length !== 1 ? 's' : ''} available
                          </p>
                        ) : (
                          hasDefaultPrice && (
                            <p className="text-sm text-green-600">
                              Single vote:{' '}
                              {formatPrice(votingContest.defaultVotePrice)}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : isInviteOnly ? (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Invitation Details</p>
                    <p className="text-muted-foreground">
                      {guests.length} guest{guests.length !== 1 ? 's' : ''} invited
                    </p>
                    {inviteOnly.allowPlusOnes && totalPlusOnes > 0 && (
                      <p className="text-sm text-purple-600">
                        Up to {totalPlusOnes} plus one{totalPlusOnes !== 1 ? 's' : ''} allowed
                      </p>
                    )}
                    {inviteOnly.requireRSVP && (
                      <p className="text-sm text-muted-foreground">
                        RSVP required
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Ticket className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {formData.isFree ? 'Free Event' : 'Paid Event'}
                    </p>
                    <p className="text-muted-foreground">
                      {ticketTypes.length} ticket{' '}
                      {ticketTypes.length === 1 ? 'type' : 'types'},{' '}
                      {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}{' '}
                      available
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Standard event specific fields */}
              {isStandardEvent && (
                <>
                  {formData.attendeeLimit && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Attendee Limit</p>
                        <p className="text-muted-foreground">
                          {formData.attendeeLimit}{' '}
                          {formData.attendeeLimit === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.age && (
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Age Restriction</p>
                        <p className="text-muted-foreground">
                          {formData.age.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.dressCode && (
                    <div className="flex items-start gap-3">
                      <Tag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Dress Code</p>
                        <p className="text-muted-foreground">
                          {formData.dressCode.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.idRequired && (
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-600">
                          ID Required
                        </p>
                        <p className="text-muted-foreground">
                          Attendees will need to bring ID to this event
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Voting contest specific fields */}
              {isVotingContest && (
                <>
                  {votingContest.maxVotesPerUser &&
                    !votingContest.allowGuestVoting && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Vote Limit</p>
                          <p className="text-muted-foreground">
                            {votingContest.maxVotesPerUser} votes per user
                          </p>
                        </div>
                      </div>
                    )}

                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Contest Rules</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {votingContest.allowGuestVoting ? (
                          <p>Guest voting enabled - no account required</p>
                        ) : (
                          <p>
                            {votingContest.allowMultipleVotes
                              ? 'Multiple votes allowed per user'
                              : 'One vote per contestant per user'}
                          </p>
                        )}
                        <p>
                          {votingContest.showLiveResults
                            ? 'Live results visible'
                            : 'Results hidden until contest ends'}
                        </p>
                        {!votingContest.allowGuestVoting && (
                          <p>
                            {votingContest.showVoterNames
                              ? 'Voter names will be displayed'
                              : 'Voter names will be private'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Invite-only specific fields */}
              {isInviteOnly && (
                <>
                  {inviteOnly.maxInvitations && (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Guest Capacity</p>
                        <p className="text-muted-foreground">
                          Maximum {inviteOnly.maxInvitations} invited guests
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ✅ NEW: Show Seating Arrangement Feature */}
                  {inviteOnly.enableSeatingArrangement && (
                    <div className="flex items-start gap-3">
                      <Armchair className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Seating Arrangement Enabled</p>
                        <p className="text-muted-foreground">
                          Table and seat assignments available
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Configure seating after event creation
                        </p>
                      </div>
                    </div>
                  )}

                  {inviteOnly.acceptDonations && (
                    <div className="flex items-start gap-3">
                      <Gift className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Donations Accepted</p>
                        {inviteOnly.suggestedDonation && (
                          <p className="text-muted-foreground">
                            Suggested: {formatPrice(inviteOnly.suggestedDonation)}
                          </p>
                        )}
                        {inviteOnly.minimumDonation && (
                          <p className="text-sm text-muted-foreground">
                            Minimum: {formatPrice(inviteOnly.minimumDonation)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Event Settings</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          {inviteOnly.isPrivate
                            ? '• Private event (invitation required)'
                            : '• Public event listing'}
                        </p>
                        {inviteOnly.requireRSVP && (
                          <p>• RSVP required from guests</p>
                        )}
                        {inviteOnly.requireApproval && (
                          <p>• RSVPs require organizer approval</p>
                        )}
                        {inviteOnly.sendAutoReminders && (
                          <p>
                            • Auto-reminders {inviteOnly.reminderDaysBefore} days before
                          </p>
                        )}
                        {/* ✅ NEW: Show seating in settings summary */}
                        {inviteOnly.enableSeatingArrangement && (
                          <p>• Seating arrangement feature enabled</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Tabs defaultValue="overview" className="mt-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isVotingContest ? (
                <TabsTrigger value="voting">Voting & Pricing</TabsTrigger>
              ) : isInviteOnly ? (
                <TabsTrigger value="guests">Guest List</TabsTrigger>
              ) : (
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
              )}
              {formData.imageUrls && formData.imageUrls.length > 0 && (
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="prose max-w-none">
                <h3 className="text-xl font-medium mb-2">
                  {isVotingContest ? 'About This Contest' : isInviteOnly ? 'About This Event' : 'About This Event'}
                </h3>
                <div className="whitespace-pre-wrap">
                  {formData.description}
                </div>
              </div>

              {formData.embeddedVideoUrl && (
                <div className="mt-6">
                  <h3 className="text-xl font-medium mb-2">
                    {isVotingContest ? 'Contest Video' : 'Event Video'}
                  </h3>
                  <div className="aspect-video mt-2">
                    <iframe
                      src={formData.embeddedVideoUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-md"
                    ></iframe>
                  </div>
                </div>
              )}
            </TabsContent>

            {isVotingContest ? (
              <TabsContent value="voting" className="mt-4">
                <h3 className="text-xl font-medium mb-4">
                  Contest Information
                </h3>

                <div className="space-y-6">
                  {/* Voting Pricing Information */}
                  {votingContest.votingType === 'PAID' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Pricing Information</h4>

                      {/* Default Vote Price */}
                      {hasDefaultPrice &&
                        (!votingContest.votePackagesEnabled ||
                          votePackages.length === 0) && (
                          <Card className="p-4 bg-green-50 border-green-200">
                            <div className="flex items-center gap-3 mb-2">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              <h5 className="font-medium text-green-900">
                                Single Vote Pricing
                              </h5>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Vote Price:</span>
                                <span className="font-medium">
                                  {formatPrice(votingContest.defaultVotePrice)}
                                </span>
                              </div>
                              <div className="flex justify-between text-blue-600">
                                <span>
                                  Platform Fee ({platformFeePercentage}%):
                                </span>
                                <span>
                                  -
                                  {formatPrice(
                                    calculatePlatformFee(
                                      votingContest.defaultVotePrice
                                    )
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between font-medium text-green-700 border-t pt-2">
                                <span>Your Earnings per Vote:</span>
                                <span>
                                  {formatPrice(
                                    votingContest.defaultVotePrice -
                                    calculatePlatformFee(
                                      votingContest.defaultVotePrice
                                    )
                                  )}
                                </span>
                              </div>
                            </div>
                          </Card>
                        )}

                      {/* Vote Packages */}
                      {votingContest.votePackagesEnabled &&
                        votePackages.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="font-medium">Vote Packages</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {votePackages.map((pkg: any, index: number) => (
                                <Card key={index} className="relative">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center justify-between">
                                      {pkg.name}
                                      <Badge variant="secondary">
                                        {pkg.voteCount} votes
                                      </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-lg font-medium text-primary">
                                      {formatPrice(pkg.price)}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    {pkg.description && (
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {pkg.description}
                                      </p>
                                    )}
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between text-blue-600">
                                        <span>
                                          Platform Fee ({platformFeePercentage}
                                          %):
                                        </span>
                                        <span>
                                          -
                                          {formatPrice(
                                            calculatePlatformFee(pkg.price)
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-medium text-green-600">
                                        <span>Your Earnings:</span>
                                        <span>
                                          {formatPrice(
                                            pkg.price -
                                            calculatePlatformFee(pkg.price)
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Per Vote:</span>
                                        <span>
                                          {formatPrice(
                                            (pkg.price -
                                              calculatePlatformFee(pkg.price)) /
                                            pkg.voteCount
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Platform Fee Information */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">
                          Platform Fee Structure
                        </h5>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>
                            • Platform fee: {platformFeePercentage}% of all vote
                            sales
                          </p>
                          <p>• Fees are automatically deducted from payments</p>
                          <p>
                            • Payouts are processed weekly to your registered
                            account
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contestants */}
                  {formData.contestants && formData.contestants.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-4">
                        Contestants ({formData.contestants.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formData.contestants.map(
                          (contestant: any, index: number) => (
                            <Card key={index} className="overflow-hidden">
                              <div className="relative h-32">
                                {contestant.imageUrl ? (
                                  <Image
                                    src={contestant.imageUrl}
                                    alt={contestant.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="h-full bg-muted flex items-center justify-center">
                                    <User className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute top-2 left-2">
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-xs"
                                  >
                                    #{contestant.contestNumber}
                                  </Badge>
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <h5 className="font-medium text-sm">
                                  {contestant.name}
                                </h5>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {contestant.bio}
                                </p>
                                <div className="flex gap-1 mt-2">
                                  {contestant.instagramUrl && (
                                    <div className="p-1 bg-pink-100 rounded-full">
                                      <Instagram className="h-2 w-2 text-pink-600" />
                                    </div>
                                  )}
                                  {contestant.twitterUrl && (
                                    <div className="p-1 bg-blue-100 rounded-full">
                                      <Twitter className="h-2 w-2 text-blue-600" />
                                    </div>
                                  )}
                                  {contestant.facebookUrl && (
                                    <div className="p-1 bg-blue-100 rounded-full">
                                      <Facebook className="h-2 w-2 text-blue-700" />
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voting Information */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Voting Access & Rules</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="flex items-center gap-2">
                        {votingContest.allowGuestVoting ? (
                          <>
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              Guest voting enabled
                            </span>
                            - No account required to vote
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-600 font-medium">
                              Account required
                            </span>
                            - Users must sign in to vote
                          </>
                        )}
                      </p>

                      {!votingContest.allowGuestVoting && (
                        <>
                          <p>
                            {votingContest.allowMultipleVotes
                              ? '• Users can vote for multiple contestants'
                              : '• Users can only vote for one contestant'}
                          </p>
                          {votingContest.maxVotesPerUser && (
                            <p>
                              • Maximum {votingContest.maxVotesPerUser} votes
                              per user
                            </p>
                          )}
                        </>
                      )}

                      <p>
                        {votingContest.showLiveResults
                          ? '• Live results visible during voting'
                          : '• Results hidden until voting ends'}
                      </p>

                      {!votingContest.allowGuestVoting &&
                        votingContest.showVoterNames && (
                          <p>
                            • Voter names will be displayed for transparency
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            ) : isInviteOnly ? (
              <TabsContent value="guests" className="mt-4">
                <h3 className="text-xl font-medium mb-4">Guest List</h3>

                <div className="space-y-6">
                  {/* Guest Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Guests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{guests.length}</div>
                        {inviteOnly.maxInvitations && (
                          <p className="text-xs text-muted-foreground mt-1">
                            of {inviteOnly.maxInvitations} maximum
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {inviteOnly.allowPlusOnes && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Plus Ones
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{totalPlusOnes}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            additional guests allowed
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Capacity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {guests.length + totalPlusOnes}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          guests + plus ones
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Seating Arrangement Info */}
                  {inviteOnly.enableSeatingArrangement && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Armchair className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Seating Arrangement Enabled</h4>
                          <p className="text-sm text-blue-800 mt-1">
                            After saving this event, you'll be able to create tables and assign guests to specific seats from the event management page. Navigate to the "Seating" tab to configure your venue layout.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Guest List Preview */}
                  {guests.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-4">
                        Invited Guests ({guests.length})
                      </h4>
                      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                        {guests.map((guest: any, index: number) => (
                          <div key={index} className="p-4 hover:bg-muted/50">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{guest.guestName}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Mail className="h-3 w-3" />
                                  {guest.guestEmail}
                                </div>
                                {guest.guestPhone && (
                                  <p className="text-sm text-muted-foreground">
                                    {guest.guestPhone}
                                  </p>
                                )}
                                {inviteOnly.enableSeatingArrangement && (
                                  <div className="mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      <Armchair className="h-3 w-3 mr-1" />
                                      Seating: Unassigned
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Seats will be assigned after event creation
                                    </p>
                                  </div>
                                )}
                              </div>
                              {guest.plusOnesAllowed > 0 && (
                                <Badge variant="secondary">
                                  +{guest.plusOnesAllowed}
                                </Badge>
                              )}
                            </div>
                            {guest.specialRequirements && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <strong>Special Requirements:</strong> {guest.specialRequirements}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event Settings */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Event Settings</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        • {inviteOnly.isPrivate ? 'Private event' : 'Public event'}
                      </p>
                      {inviteOnly.requireRSVP && (
                        <p>• RSVP required from all guests</p>
                      )}
                      {inviteOnly.requireApproval && (
                        <p>• RSVPs require organizer approval</p>
                      )}
                      {inviteOnly.sendAutoReminders && (
                        <p>
                          • Automated reminders sent {inviteOnly.reminderDaysBefore} days
                          before event
                        </p>
                      )}
                      {inviteOnly.acceptDonations && (
                        <p>• Accepting donations from guests</p>
                      )}
                    </div>
                  </div>

                  {/* Donation Information */}
                  {inviteOnly.acceptDonations && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h5 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Donation Information
                      </h5>
                      <div className="text-sm text-purple-800 space-y-1">
                        {inviteOnly.suggestedDonation && (
                          <p>
                            • Suggested donation: {formatPrice(inviteOnly.suggestedDonation)}
                          </p>
                        )}
                        {inviteOnly.minimumDonation && (
                          <p>
                            • Minimum donation: {formatPrice(inviteOnly.minimumDonation)}
                          </p>
                        )}
                        {inviteOnly.donationDescription && (
                          <p className="mt-2">{inviteOnly.donationDescription}</p>
                        )}
                        <p className="mt-2">
                          • Platform fee: {platformFeePercentage}% of donations
                        </p>
                        {inviteOnly.showDonorNames ? (
                          <p>• Donor names will be displayed</p>
                        ) : (
                          <p>• Anonymous donations allowed</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ) : (
              <TabsContent value="tickets" className="mt-4">
                <h3 className="text-xl font-medium mb-4">Ticket Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ticketTypes.map((ticket, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle>{ticket.name}</CardTitle>
                        <CardDescription>
                          {formData.isFree ? 'Free' : formatPrice(ticket.price)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {ticket.quantity}{' '}
                          {ticket.quantity === 1 ? 'ticket' : 'tickets'}{' '}
                          available
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}

            {formData.imageUrls && formData.imageUrls.length > 0 && (
              <TabsContent value="gallery" className="mt-4">
                <h3 className="text-xl font-medium mb-4">
                  {isVotingContest ? 'Contest Gallery' : 'Event Gallery'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.imageUrls.map((imageUrl: string, index: number) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-md overflow-hidden"
                    >
                      <Image
                        src={imageUrl}
                        alt={`${isVotingContest ? 'Contest' : 'Event'} image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => onSubmit('DRAFT')}
            disabled={isSubmitting}
          >
            {isEditing ? 'Save as Draft' : 'Save as Draft'}
          </Button>

          {canPublishDirectly ? (
            <Button
              onClick={() => onSubmit('PUBLISHED')}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Publishing...'
                : `Publish ${getEventTypeLabel()}`}
            </Button>
          ) : (
            <Button
              onClick={() => onSubmit('PENDING_REVIEW')}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Submitting...'
                : isEditing
                  ? 'Submit Changes for Review'
                  : 'Submit for Review'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}