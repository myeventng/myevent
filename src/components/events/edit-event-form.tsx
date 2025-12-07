'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateEvent } from '@/actions/event.actions';
import {
  updateContestant,
  deleteContestant,
  createContestant,
  updateVotePackages,
  updateVotingContest,
} from '@/actions/voting-contest.actions';
import {
  updateInviteOnlyEvent,
  updateInvitation,
  deleteInvitation,
  createInvitation,
} from '@/actions/invite-only.action';
import {
  updateTicketType,
  deleteTicketType,
  createTicketType,
  getTicketTypesByEvent,
} from '@/actions/ticket.actions';
import { AgeRestriction, DressCode, EventType, VotingType } from '@/generated/prisma';
import { toast } from 'sonner';

// Step components
import { EventBasicInfo } from './event-basic-info';
import { EventLocationDetails } from './event-location-details';
import { EventSchedule } from './event-schedule';
import { EventMediaUpload } from './event-media-upload';
import { EventTickets } from './event-tickets';
import { VotingContestSetup } from './voting-contest-setup';
import { ContestantManagement } from './contestant-management';
import { InviteOnlySetup } from './invite-only-setup';
import { GuestManagement } from './guest-management';
import { EventPreview } from './event-preview';

// Schemas
const baseEventSchema = z.object({
  id: z.string(),
  eventType: z.nativeEnum(EventType),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  url: z.string().url().optional().or(z.literal('')),
  venueId: z.string().min(1, 'Venue is required'),
  cityId: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.date(),
  endDateTime: z.date(),
  lateEntry: z.date().optional(),
  coverImageUrl: z.string().min(1, 'Cover image is required'),
  imageUrls: z.array(z.string()).default([]),
  embeddedVideoUrl: z.string().optional().or(z.literal('')),
});

const standardEventSchema = baseEventSchema.extend({
  age: z.nativeEnum(AgeRestriction).optional(),
  dressCode: z.nativeEnum(DressCode).optional(),
  isFree: z.boolean().default(false),
  idRequired: z.boolean().default(false),
  attendeeLimit: z.number().optional(),
});

const votingContestEventSchema = baseEventSchema.extend({
  // isFree: z.literal(true).default(true),
});

const inviteOnlyEventSchema = baseEventSchema.extend({
  // isFree: z.literal(true).default(true),
});

// Steps configuration
const getStepsForEventType = (eventType: EventType) => {
  const baseSteps = [
    { id: 'basic-info', title: 'Basic Info' },
    { id: 'location', title: 'Location' },
    { id: 'schedule', title: 'Schedule' },
    { id: 'media', title: 'Media' },
  ];

  if (eventType === EventType.VOTING_CONTEST) {
    return [
      ...baseSteps,
      { id: 'voting-setup', title: 'Voting Setup' },
      { id: 'contestants', title: 'Contestants' },
      { id: 'preview', title: 'Preview' },
    ];
  } else if (eventType === EventType.INVITE) {
    return [
      ...baseSteps,
      { id: 'invite-setup', title: 'Invite Settings' },
      { id: 'guest-management', title: 'Guest List' },
      { id: 'preview', title: 'Preview' },
    ];
  } else {
    return [
      ...baseSteps,
      { id: 'tickets', title: 'Tickets' },
      { id: 'preview', title: 'Preview' },
    ];
  }
};

interface EditEventFormProps {
  initialData: any;
  isEditing?: boolean;
  userRole?: string;
  userSubRole?: string;
}

export function EditEventForm({
  initialData,
  isEditing = true,
  userRole = 'USER',
  userSubRole = 'ORDINARY',
}: EditEventFormProps) {
  const eventData = initialData;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>(() => {
    console.log('=== INITIALIZING EDIT FORM ===');
    console.log('Event data received:', eventData);

    // Extract contestants from correct location
    const contestantsFromRoot = eventData.contestants || [];
    const contestantsFromVotingContest =
      eventData.votingContest?.contestants || [];
    const contestants =
      contestantsFromRoot.length > 0
        ? contestantsFromRoot
        : contestantsFromVotingContest;

    // Extract guests from correct location
    const guestsFromRoot = eventData.guests || [];
    const guestsFromInviteOnly = eventData.inviteOnlyEvent?.invitations || [];
    const guests =
      guestsFromRoot.length > 0 ? guestsFromRoot : guestsFromInviteOnly;

    // Initialize form data
    const initialFormData = {
      id: eventData.id,
      eventType: eventData.eventType || EventType.STANDARD,
      title: eventData.title || '',
      description: eventData.description || '',
      location: eventData.location || '',
      coverImageUrl: eventData.coverImageUrl || '',
      imageUrls: eventData.imageUrls || [],
      url: eventData.url || '',
      embeddedVideoUrl: eventData.embeddedVideoUrl || '',
      categoryId: eventData.categoryId || '',
      tagIds: eventData.tags?.map((tag: any) => tag.id) || [],
      venueId: eventData.venueId || '',
      cityId: eventData.cityId || '',
      startDateTime: eventData.startDateTime
        ? new Date(eventData.startDateTime)
        : new Date(),
      endDateTime: eventData.endDateTime
        ? new Date(eventData.endDateTime)
        : new Date(),
      lateEntry: eventData.lateEntry ? new Date(eventData.lateEntry) : undefined,
      // Standard event fields
      age: eventData.age,
      dressCode: eventData.dressCode,
      isFree: eventData.isFree || false,
      idRequired: eventData.idRequired || false,
      attendeeLimit: eventData.attendeeLimit,
      // Voting contest data
      votingContest: eventData.votingContest
        ? {
          id: eventData.votingContest.id,
          votingType: eventData.votingContest.votingType || VotingType.FREE,
          votePackagesEnabled:
            eventData.votingContest.votePackagesEnabled || false,
          defaultVotePrice: eventData.votingContest.defaultVotePrice,
          allowGuestVoting: eventData.votingContest.allowGuestVoting || false,
          maxVotesPerUser: eventData.votingContest.maxVotesPerUser,
          allowMultipleVotes:
            eventData.votingContest.allowMultipleVotes !== false,
          votingStartDate: eventData.votingContest.votingStartDate
            ? new Date(eventData.votingContest.votingStartDate)
            : undefined,
          votingEndDate: eventData.votingContest.votingEndDate
            ? new Date(eventData.votingContest.votingEndDate)
            : undefined,
          showLiveResults: eventData.votingContest.showLiveResults !== false,
          showVoterNames: eventData.votingContest.showVoterNames || false,
          votePackages: eventData.votingContest.votePackages || [],
        }
        : undefined,
      contestants: contestants.map((contestant: any) => ({
        id: contestant.id,
        name: contestant.name,
        bio: contestant.bio || '',
        imageUrl: contestant.imageUrl || '',
        contestNumber: contestant.contestNumber,
        instagramUrl: contestant.instagramUrl || '',
        twitterUrl: contestant.twitterUrl || '',
        facebookUrl: contestant.facebookUrl || '',
        status: contestant.status,
      })),
      // Invite-only data
      inviteOnly: eventData.inviteOnlyEvent
        ? {
          id: eventData.inviteOnlyEvent.id,
          maxInvitations: eventData.inviteOnlyEvent.maxInvitations,
          allowPlusOnes: eventData.inviteOnlyEvent.allowPlusOnes || false,
          maxPlusOnes: eventData.inviteOnlyEvent.maxPlusOnes,
          requireRSVP: eventData.inviteOnlyEvent.requireRSVP !== false,
          rsvpDeadline: eventData.inviteOnlyEvent.rsvpDeadline
            ? new Date(eventData.inviteOnlyEvent.rsvpDeadline)
            : undefined,
          sendAutoReminders:
            eventData.inviteOnlyEvent.sendAutoReminders !== false,
          reminderDaysBefore:
            eventData.inviteOnlyEvent.reminderDaysBefore || 7,
          acceptDonations: eventData.inviteOnlyEvent.acceptDonations || false,
          suggestedDonation: eventData.inviteOnlyEvent.suggestedDonation,
          minimumDonation: eventData.inviteOnlyEvent.minimumDonation,
          donationDescription: eventData.inviteOnlyEvent.donationDescription,
          showDonorNames: eventData.inviteOnlyEvent.showDonorNames !== false,
          isPrivate: eventData.inviteOnlyEvent.isPrivate !== false,
          requireApproval: eventData.inviteOnlyEvent.requireApproval || false,
        }
        : undefined,
      guests: guests.map((guest: any) => ({
        id: guest.id,
        guestName: guest.guestName,
        guestEmail: guest.guestEmail,
        guestPhone: guest.guestPhone || '',
        plusOnesAllowed: guest.plusOnesAllowed || 0,
        specialRequirements: guest.specialRequirements || '',
        organizerNotes: guest.organizerNotes || '',
      })),
    };

    console.log('Initialized form data:', initialFormData);
    return initialFormData;
  });

  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [originalTicketTypes, setOriginalTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedContestants, setDeletedContestants] = useState<string[]>([]);
  const [deletedGuests, setDeletedGuests] = useState<string[]>([]);
  const [deletedTicketTypes, setDeletedTicketTypes] = useState<string[]>([]);

  const steps = getStepsForEventType(formData.eventType);
  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isInviteOnly = formData.eventType === EventType.INVITE;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

  // Load existing ticket types for standard events
  useEffect(() => {
    const loadTicketTypes = async () => {
      if (!isVotingContest && !isInviteOnly && eventData.id) {
        try {
          const result = await getTicketTypesByEvent(eventData.id);
          if (result.success && result.data) {
            setTicketTypes(result.data);
            setOriginalTicketTypes(result.data);
          }
        } catch (error) {
          console.error('Error loading ticket types:', error);
        }
      }
    };

    loadTicketTypes();
  }, [eventData.id, isVotingContest, isInviteOnly]);

  // Update form data helper
  const updateFormData = (data: any) => {
    console.log('=== UPDATE FORM DATA CALLED ===');
    console.log('Update data received:', data);

    setFormData((prev: any) => {
      const updated = { ...prev };

      Object.keys(data).forEach((key) => {
        if (
          (key === 'votingContest' || key === 'inviteOnly') &&
          typeof data[key] === 'object' &&
          data[key] !== null
        ) {
          updated[key] = {
            ...updated[key],
            ...data[key],
          };
        } else if (
          (key === 'contestants' || key === 'guests') &&
          Array.isArray(data[key])
        ) {
          console.log(`Updating ${key} array:`, data[key]);
          updated[key] = [...data[key]];
        } else {
          updated[key] = data[key];
        }
      });

      // Ensure arrays are never undefined
      if (!updated.tagIds) updated.tagIds = [];
      if (!updated.imageUrls) updated.imageUrls = [];
      if (!updated.contestants) updated.contestants = [];
      if (!updated.guests) updated.guests = [];

      // Ensure strings are never undefined
      if (updated.title === undefined) updated.title = '';
      if (updated.description === undefined) updated.description = '';
      if (updated.location === undefined) updated.location = '';
      if (updated.coverImageUrl === undefined) updated.coverImageUrl = '';
      if (updated.url === undefined) updated.url = '';
      if (updated.embeddedVideoUrl === undefined) updated.embeddedVideoUrl = '';

      console.log('Updated form data:', updated);
      return updated;
    });
  };

  // Custom handlers for tracking deletions
  const handleTicketTypeChange = (tickets: any[], deleted: string[] = []) => {
    setTicketTypes(tickets);
    setDeletedTicketTypes((prev) => [...new Set([...prev, ...deleted])]);
  };

  const handleContestantDelete = (contestantId: string) => {
    if (contestantId && !contestantId.startsWith('temp-')) {
      setDeletedContestants((prev) => [...prev, contestantId]);
    }
  };

  const handleGuestDelete = (guestId: string) => {
    if (guestId && !guestId.startsWith('temp-')) {
      setDeletedGuests((prev) => [...prev, guestId]);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  // Submit handler
  const handleSubmit = async (
    publishStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED'
  ) => {
    try {
      setIsSubmitting(true);

      // Validate based on event type
      let validatedData;
      if (isVotingContest) {
        validatedData = votingContestEventSchema.parse(formData);
      } else if (isInviteOnly) {
        validatedData = inviteOnlyEventSchema.parse(formData);
      } else {
        validatedData = standardEventSchema.parse(formData);
      }

      // Prepare base event update data (without type-specific nested data)
      const eventUpdateData = {
        ...validatedData,
        eventType: formData.eventType,
        publishedStatus: publishStatus,
      };

      console.log('Updating event with data:', eventUpdateData);

      // Update the main event first
      const result = await updateEvent(eventUpdateData);

      if (result.success && result.data) {
        const eventId = result.data.id;

        // Handle voting contest updates using specialized actions
        if (isVotingContest && formData.votingContest) {
          try {
            const contestId = formData.votingContest.id;

            if (contestId) {
              // Update voting contest settings
              console.log('Updating voting contest settings');
              await updateVotingContest({
                contestId,
                votingType: formData.votingContest.votingType,
                votePackagesEnabled: formData.votingContest.votePackagesEnabled || false,
                defaultVotePrice: formData.votingContest.defaultVotePrice,
                allowGuestVoting: formData.votingContest.allowGuestVoting || false,
                maxVotesPerUser: formData.votingContest.maxVotesPerUser,
                allowMultipleVotes: formData.votingContest.allowMultipleVotes !== false,
                showLiveResults: formData.votingContest.showLiveResults !== false,
                showVoterNames: formData.votingContest.showVoterNames || false,
              });

              // Delete removed contestants
              for (const deletedId of deletedContestants) {
                console.log('Deleting contestant:', deletedId);
                await deleteContestant(deletedId);
              }

              // Update/create contestants
              for (const contestant of formData.contestants) {
                if (!contestant.name || !contestant.contestNumber) continue;

                if (contestant.id && !contestant.id.startsWith('temp-')) {
                  // Update existing
                  console.log('Updating contestant:', contestant.id);
                  await updateContestant({
                    id: contestant.id,
                    contestId,
                    name: contestant.name,
                    bio: contestant.bio || '',
                    imageUrl: contestant.imageUrl || '',
                    contestNumber: contestant.contestNumber,
                    instagramUrl: contestant.instagramUrl || '',
                    twitterUrl: contestant.twitterUrl || '',
                    facebookUrl: contestant.facebookUrl || '',
                  });
                } else {
                  // Create new
                  console.log('Creating new contestant');
                  await createContestant({
                    contestId,
                    name: contestant.name,
                    bio: contestant.bio || '',
                    imageUrl: contestant.imageUrl || '',
                    contestNumber: contestant.contestNumber,
                    instagramUrl: contestant.instagramUrl || '',
                    twitterUrl: contestant.twitterUrl || '',
                    facebookUrl: contestant.facebookUrl || '',
                  });
                }
              }

              // Update vote packages
              if (
                formData.votingContest.votePackagesEnabled &&
                formData.votingContest.votePackages
              ) {
                console.log('Updating vote packages');
                await updateVotePackages({
                  contestId,
                  packages: formData.votingContest.votePackages.map(
                    (pkg: any) => ({
                      name: pkg.name,
                      description: pkg.description || '',
                      voteCount: parseInt(pkg.voteCount, 10),
                      price: parseFloat(pkg.price),
                      sortOrder: parseInt(pkg.sortOrder, 10) || 0,
                    })
                  ),
                });
              }
            }
          } catch (contestError) {
            console.error('Error handling voting contest:', contestError);
            toast.error('Failed to update voting contest details');
          }
        }

        // Handle invite-only updates using specialized actions
        if (isInviteOnly && formData.inviteOnly) {
          try {
            const inviteOnlyEventId = formData.inviteOnly.id;

            if (inviteOnlyEventId) {
              // Update invite-only configuration
              console.log('Updating invite-only configuration');
              await updateInviteOnlyEvent({
                id: inviteOnlyEventId,
                ...formData.inviteOnly,
              });

              // Delete removed guests
              for (const deletedId of deletedGuests) {
                console.log('Deleting guest:', deletedId);
                await deleteInvitation(deletedId);
              }

              // Update/create guests
              for (const guest of formData.guests) {
                if (!guest.guestName || !guest.guestEmail) continue;

                if (guest.id && !guest.id.startsWith('temp-')) {
                  // Update existing
                  console.log('Updating guest:', guest.id);
                  await updateInvitation({
                    id: guest.id,
                    guestName: guest.guestName,
                    guestEmail: guest.guestEmail,
                    guestPhone: guest.guestPhone,
                    plusOnesAllowed: guest.plusOnesAllowed,
                    specialRequirements: guest.specialRequirements,
                    organizerNotes: guest.organizerNotes,
                  });
                } else {
                  // Create new
                  console.log('Creating new guest');
                  await createInvitation({
                    inviteOnlyEventId,
                    guestName: guest.guestName,
                    guestEmail: guest.guestEmail,
                    guestPhone: guest.guestPhone,
                    plusOnesAllowed: guest.plusOnesAllowed || 0,
                    specialRequirements: guest.specialRequirements,
                    organizerNotes: guest.organizerNotes,
                    sendEmail: false,
                  });
                }
              }
            }
          } catch (inviteError) {
            console.error('Error handling invite-only:', inviteError);
            toast.error('Failed to update invite-only details');
          }
        }

        // Handle standard event ticket types
        if (isStandardEvent) {
          try {
            // Delete removed ticket types
            for (const deletedId of deletedTicketTypes) {
              if (!deletedId.startsWith('temp-')) {
                console.log('Deleting ticket type:', deletedId);
                await deleteTicketType(deletedId);
              }
            }

            // Update/create ticket types
            for (const ticketType of ticketTypes) {
              if (!ticketType.name || ticketType.quantity <= 0) continue;

              if (ticketType.id && !ticketType.id.startsWith('temp-')) {
                // Update existing
                console.log('Updating ticket type:', ticketType.id);
                await updateTicketType({
                  id: ticketType.id,
                  eventId,
                  name: ticketType.name,
                  price: parseFloat(ticketType.price.toString()),
                  quantity: parseInt(ticketType.quantity.toString(), 10),
                });
              } else {
                // Create new
                console.log('Creating new ticket type');
                await createTicketType({
                  eventId,
                  name: ticketType.name,
                  price: parseFloat(ticketType.price.toString()),
                  quantity: parseInt(ticketType.quantity.toString(), 10),
                });
              }
            }
          } catch (ticketError) {
            console.error('Error handling ticket types:', ticketError);
            toast.error('Failed to update ticket types');
          }
        }

        toast.success(result.message || 'Event updated successfully');
        const redirectPath =
          userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
            ? '/admin/dashboard/events'
            : '/dashboard/events';

        router.push(redirectPath);
      } else {
        toast.error(result.message || 'Failed to update event');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error('Error updating event:', error);
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <EventBasicInfo
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 1:
        return (
          <EventLocationDetails
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 2:
        return (
          <EventSchedule
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <EventMediaUpload
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        if (isVotingContest) {
          return (
            <VotingContestSetup
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          );
        } else if (isInviteOnly) {
          return (
            <InviteOnlySetup
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          );
        } else {
          return (
            <EventTickets
              formData={formData}
              ticketTypes={ticketTypes}
              setTicketTypes={(tickets) => handleTicketTypeChange(tickets)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          );
        }
      case 5:
        if (isVotingContest) {
          return (
            <ContestantManagement
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onDeleteContestant={handleContestantDelete}
              isEditMode={true}
            />
          );
        } else if (isInviteOnly) {
          return (
            <GuestManagement
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onDeleteGuest={handleGuestDelete}
              isEditMode={true}
            />
          );
        } else {
          return (
            <EventPreview
              formData={formData}
              ticketTypes={ticketTypes}
              onPrevious={handlePrevious}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isEditing={true}
              userRole={userRole}
              userSubRole={userSubRole}
            />
          );
        }
      case 6:
        return (
          <EventPreview
            formData={formData}
            ticketTypes={isVotingContest || isInviteOnly ? [] : ticketTypes}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isEditing={true}
            userRole={userRole}
            userSubRole={userSubRole}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex justify-between items-center mb-8 overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div
              className={`rounded-full h-10 w-10 flex items-center justify-center ${index < currentStep
                ? 'bg-green-500 text-white'
                : index === currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700'
                }`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="ml-2 hidden md:block">{step.title}</div>
            {index < steps.length - 1 && (
              <div className="w-12 h-1 mx-2 bg-gray-200">
                <div
                  className={`h-full ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  style={{ width: `${index < currentStep ? '100%' : '0%'}` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current step form */}
      <Card>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}