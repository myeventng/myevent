'use client';

import { useState } from 'react';
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
  CheckCircle,
  X,
  Star,
  StarOff,
  ExternalLink,
  RotateCcw,
  Vote,
  Users,
  Trophy,
  DollarSign,
  Crown,
  Medal,
  Award,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EventType } from '@/generated/prisma';

interface EventPreviewModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason?: string) => void;
  onToggleFeature?: (id: string) => void;
  onMoveToPending?: (id: string) => void;
  isUpdating: boolean;
  userRole: string;
  userSubRole: string;
  showFeatureActions?: boolean;
  showRejectedActions?: boolean;
}

export function EventPreviewModal({
  event,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onToggleFeature,
  onMoveToPending,
  isUpdating,
  userRole,
  userSubRole,
  showFeatureActions = false,
  showRejectedActions = false,
}: EventPreviewModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Format date and time
  const formatDateTime = (date: string | Date) => {
    return format(new Date(date), 'PPP p');
  };

  // Calculate total tickets available (for standard events)
  const totalTickets =
    event.ticketTypes?.reduce(
      (sum: number, ticket: any) => sum + ticket.quantity,
      0
    ) || 0;

  // Calculate voting contest stats
  const contestantCount = event.votingContest?.contestants?.length || 0;
  const totalVotes = event.votingContest?.votes?.length || 0;

  // Check if user can perform admin actions
  const isAdmin =
    userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  const handleReject = () => {
    if (onReject) {
      onReject(event.id, rejectionReason);
      setShowRejectionForm(false);
      setRejectionReason('');
      onClose();
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove(event.id);
      onClose();
    }
  };

  const handleToggleFeature = () => {
    if (onToggleFeature) {
      onToggleFeature(event.id);
      onClose();
    }
  };

  const handleMoveToPending = () => {
    if (onMoveToPending) {
      onMoveToPending(event.id);
      onClose();
    }
  };

  // Get event type badge
  const getEventTypeBadge = (eventType: EventType) => {
    switch (eventType) {
      case 'STANDARD':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Calendar className="h-3 w-3 mr-1" />
            Standard Event
          </Badge>
        );
      case 'VOTING_CONTEST':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800">
            <Vote className="h-3 w-3 mr-1" />
            Voting Contest
          </Badge>
        );
      case 'INVITE':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <Users className="h-3 w-3 mr-1" />
            Invite Only
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown Type</Badge>;
    }
  };

  // Get rank icon for contestants
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-sm font-medium">#{rank}</span>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Event Preview</span>
          </DialogTitle>
          <DialogDescription>
            Review the event details and take action as needed.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Cover Image */}
            <div className="relative h-48 rounded-lg overflow-hidden">
              {event.coverImageUrl ? (
                <Image
                  src={event.coverImageUrl}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">No cover image</p>
                </div>
              )}
            </div>

            {/* Event Title and Basic Info */}
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>

              <div className="flex flex-wrap gap-2 mt-3">
                {getEventTypeBadge(event.eventType)}
                {event.category && (
                  <Badge variant="outline" className="bg-primary/10">
                    {event.category.name}
                  </Badge>
                )}
                {event.tags?.map((tag: any) => (
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
                {event.featured && (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-800"
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(event.startDateTime)} -{' '}
                      {formatDateTime(event.endDateTime)}
                    </p>
                    {event.lateEntry && (
                      <p className="text-sm text-amber-600">
                        Late entry until: {formatDateTime(event.lateEntry)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{event.venue?.name}</p>
                    <p className="text-muted-foreground">
                      {event.venue?.address}
                    </p>
                    <p className="text-muted-foreground">
                      {event.venue?.city?.name}, {event.venue?.city?.state}
                    </p>
                    {event.location && (
                      <p className="text-sm mt-1">{event.location}</p>
                    )}
                  </div>
                </div>

                {/* Dynamic content based on event type */}
                {event.eventType === 'VOTING_CONTEST' ? (
                  <div className="flex items-start gap-3">
                    <Vote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Voting Contest</p>
                      <p className="text-muted-foreground">
                        {contestantCount} contestant
                        {contestantCount !== 1 ? 's' : ''}, {totalVotes} votes
                        cast
                      </p>
                      {event.votingContest?.votingType && (
                        <p className="text-sm mt-1">
                          <Badge
                            variant={
                              event.votingContest.votingType === 'FREE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {event.votingContest.votingType === 'FREE'
                              ? 'Free Voting'
                              : 'Paid Voting'}
                          </Badge>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Ticket className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {event.isFree ? 'Free Event' : 'Paid Event'}
                      </p>
                      <p className="text-muted-foreground">
                        {event.ticketTypes?.length || 0} ticket{' '}
                        {(event.ticketTypes?.length || 0) === 1
                          ? 'type'
                          : 'types'}
                        , {totalTickets}{' '}
                        {totalTickets === 1 ? 'ticket' : 'tickets'} available
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {event.user && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Organizer</p>
                      {event.user.organizerProfile ? (
                        <>
                          <p className="text-muted-foreground">
                            {event.user.organizerProfile.organizationName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.user.name}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          {event.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {event.attendeeLimit && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Attendee Limit</p>
                      <p className="text-muted-foreground">
                        {event.attendeeLimit}{' '}
                        {event.attendeeLimit === 1 ? 'person' : 'people'}
                      </p>
                    </div>
                  </div>
                )}

                {event.age && (
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Age Restriction</p>
                      <p className="text-muted-foreground">
                        {event.age.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {event.dressCode && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Dress Code</p>
                      <p className="text-muted-foreground">
                        {event.dressCode.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {event.idRequired && (
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600">ID Required</p>
                      <p className="text-muted-foreground">
                        Attendees will need to bring ID to this event
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Tabs based on event type */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                {event.eventType === 'VOTING_CONTEST' ? (
                  <TabsTrigger value="contestants">Contestants</TabsTrigger>
                ) : (
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                )}
                {event.imageUrls && event.imageUrls.length > 0 && (
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap">
                    {event.description || 'No description provided.'}
                  </div>
                </div>

                {event.embeddedVideoUrl && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Event Video</h3>
                    <div className="aspect-video">
                      <iframe
                        src={event.embeddedVideoUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-md"
                      ></iframe>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Contestants Tab (for Voting Contest) */}
              {event.eventType === 'VOTING_CONTEST' && (
                <TabsContent value="contestants" className="mt-4">
                  <div className="space-y-4">
                    {event.votingContest?.contestants?.length > 0 ? (
                      event.votingContest.contestants
                        .sort(
                          (a: any, b: any) =>
                            (b.votes?.length || 0) - (a.votes?.length || 0)
                        )
                        .map((contestant: any, index: number) => {
                          const voteCount = contestant.votes?.length || 0;
                          const percentage =
                            totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

                          return (
                            <div
                              key={contestant.id}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {contestant.imageUrl && (
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                                      <Image
                                        src={contestant.imageUrl}
                                        alt={contestant.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {getRankIcon(index + 1)}
                                    <div>
                                      <h4 className="font-medium">
                                        {contestant.name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        #{contestant.contestNumber}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    {voteCount.toLocaleString()} votes
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              {percentage > 0 && (
                                <div className="mb-3">
                                  <Progress
                                    value={percentage}
                                    className="h-2"
                                  />
                                </div>
                              )}

                              {contestant.bio && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {contestant.bio}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <Badge
                                  variant={
                                    contestant.status === 'ACTIVE'
                                      ? 'default'
                                      : 'destructive'
                                  }
                                >
                                  {contestant.status}
                                </Badge>
                                {contestant.instagramUrl && (
                                  <Badge variant="outline">Instagram</Badge>
                                )}
                                {contestant.twitterUrl && (
                                  <Badge variant="outline">Twitter</Badge>
                                )}
                                {contestant.facebookUrl && (
                                  <Badge variant="outline">Facebook</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">
                          No contestants yet
                        </p>
                        <p className="text-muted-foreground">
                          Contestants will appear here once they are added to
                          the contest.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Tickets Tab (for Standard Events) */}
              {event.eventType === 'STANDARD' && (
                <TabsContent value="tickets" className="mt-4">
                  <div className="space-y-4">
                    {event.ticketTypes?.length > 0 ? (
                      event.ticketTypes.map((ticket: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{ticket.name}</h4>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {event.isFree
                                  ? 'Free'
                                  : formatPrice(ticket.price)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {ticket.quantity} available
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        No ticket types defined.
                      </p>
                    )}
                  </div>
                </TabsContent>
              )}

              {event.imageUrls && event.imageUrls.length > 0 && (
                <TabsContent value="gallery" className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.imageUrls.map((imageUrl: string, index: number) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-md overflow-hidden"
                      >
                        <Image
                          src={imageUrl}
                          alt={`Event image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Rejection Form */}
            {showRejectionForm && (
              <div className="border rounded-lg p-4 bg-red-50">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this event..."
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={isUpdating || !rejectionReason.trim()}
                      variant="destructive"
                      size="sm"
                    >
                      {isUpdating ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowRejectionForm(false);
                        setRejectionReason('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            {/* Pending Review Actions */}
            {onApprove && event.publishedStatus === 'PENDING_REVIEW' && (
              <Button
                onClick={handleApprove}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isUpdating ? 'Approving...' : 'Approve & Publish'}
              </Button>
            )}

            {onReject &&
              event.publishedStatus === 'PENDING_REVIEW' &&
              !showRejectionForm && (
                <Button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isUpdating}
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}

            {/* Rejected Event Actions */}
            {showRejectedActions && event.publishedStatus === 'REJECTED' && (
              <>
                <Button
                  onClick={handleMoveToPending}
                  disabled={isUpdating}
                  variant="outline"
                  className="text-amber-600 hover:text-amber-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Moving...' : 'Move to Pending'}
                </Button>

                <Button
                  onClick={handleApprove}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Publishing...' : 'Publish Directly'}
                </Button>
              </>
            )}

            {/* Feature Actions */}
            {onToggleFeature && showFeatureActions && (
              <Button
                onClick={handleToggleFeature}
                disabled={isUpdating}
                variant={event.featured ? 'destructive' : 'default'}
              >
                {event.featured ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Unfeaturing...' : 'Unfeature'}
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    {isUpdating ? 'Featuring...' : 'Feature'}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
