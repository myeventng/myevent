'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  MapPin,
  Calendar,
  Clock,
  Tag,
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

  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

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
          if (formData.venueId === 'online') {
            // Handle online venue
            setVenue({
              id: 'online',
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

  // Check if user can publish directly
  const canPublishDirectly =
    userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {isVotingContest ? (
            <Vote className="h-6 w-6 text-primary" />
          ) : (
            <Calendar className="h-6 w-6 text-primary" />
          )}
          <h2 className="text-2xl font-bold">
            {isVotingContest ? 'Contest Preview' : 'Event Preview'}
          </h2>
        </div>
        <p className="text-muted-foreground">
          {isEditing
            ? `Review your updated ${isVotingContest ? 'contest' : 'event'} details before saving.`
            : `Review your ${isVotingContest ? 'contest' : 'event'} details before submitting.`}
        </p>
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
                    {isVotingContest ? 'Contest Period' : 'Date & Time'}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDateTime(formData.startDateTime)} -{' '}
                    {formatDateTime(formData.endDateTime)}
                  </p>
                  {formData.lateEntry && !isVotingContest && (
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
                    {votingContest.votePackagesEnabled && (
                      <p className="text-sm text-blue-600">
                        {votePackages.length} vote package
                        {votePackages.length !== 1 ? 's' : ''} available
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
                  {votingContest.maxVotesPerUser && (
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
                        <p>
                          {votingContest.allowMultipleVotes
                            ? 'Multiple votes allowed per user'
                            : 'One vote per contestant per user'}
                        </p>
                        <p>
                          {votingContest.showLiveResults
                            ? 'Live results visible'
                            : 'Results hidden until contest ends'}
                        </p>
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
                <TabsTrigger value="voting">Voting</TabsTrigger>
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
                  {isVotingContest ? 'About This Contest' : 'About This Event'}
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
                    <h4 className="font-medium mb-2">Voting Type</h4>
                    <p className="text-sm text-muted-foreground">
                      {votingContest.votingType === 'PAID'
                        ? 'This is a paid voting contest. Users need to purchase votes to participate.'
                        : 'This is a free voting contest. Users can vote without payment.'}
                    </p>
                  </div>

                  {votingContest.votePackagesEnabled &&
                    votePackages.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Vote Packages</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {votePackages.map((pkg: any, index: number) => (
                            <Card key={index}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                  {pkg.name}
                                </CardTitle>
                                <CardDescription>
                                  {formatPrice(pkg.price)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {pkg.voteCount} votes
                                </p>
                                {pkg.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {pkg.description}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium mb-2 text-blue-900">
                      Contest Rules
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      {votingContest.maxVotesPerUser && (
                        <p>
                          • Maximum {votingContest.maxVotesPerUser} votes per
                          user
                        </p>
                      )}
                      <p>
                        •{' '}
                        {votingContest.allowMultipleVotes
                          ? 'Users can vote for multiple contestants'
                          : 'Users can only vote for one contestant'}
                      </p>
                      <p>
                        •{' '}
                        {votingContest.showLiveResults
                          ? 'Live results will be visible during voting'
                          : 'Results will be hidden until voting ends'}
                      </p>
                      {votingContest.showVoterNames && (
                        <p>• Voter names will be displayed for transparency</p>
                      )}
                    </div>
                  </div>
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
                : `Publish ${isVotingContest ? 'Contest' : 'Event'}`}
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
