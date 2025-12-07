'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createEvent } from '@/actions/event.actions';
import {
  createVotingContest,
  createContestant,
  createVotePackage,
} from '@/actions/voting-contest.actions';
import {
  createInviteOnlyEvent,
  bulkCreateInvitations,
} from '@/actions/invite-only.action';
import { createTicketType } from '@/actions/ticket.actions';
import { AgeRestriction, DressCode, EventType, VotingType } from '@/generated/prisma';
import { toast } from 'sonner';

// Step components
import { EventTypeSelection } from './event-type-selection';
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
  isFree: z.literal(true).default(true),
});

const inviteOnlyEventSchema = baseEventSchema.extend({
  isFree: z.literal(true).default(true),
});

type BaseEventFormValues = z.infer<typeof baseEventSchema>;
type StandardEventFormValues = z.infer<typeof standardEventSchema>;
type VotingContestEventFormValues = z.infer<typeof votingContestEventSchema>;
type InviteOnlyEventFormValues = z.infer<typeof inviteOnlyEventSchema>;

// Steps configuration
const getStepsForEventType = (eventType: EventType) => {
  const baseSteps = [
    { id: 'event-type', title: 'Event Type' },
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

interface CreateEventFormProps {
  userRole?: string;
  userSubRole?: string;
}

export function CreateEventForm({
  userRole = 'USER',
  userSubRole = 'ORDINARY',
}: CreateEventFormProps = {}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({
    eventType: EventType.STANDARD,
    tagIds: [],
    imageUrls: [],
    isFree: false,
    idRequired: false,
    title: '',
    description: '',
    location: '',
    coverImageUrl: '',
    url: '',
    embeddedVideoUrl: '',
  });
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = getStepsForEventType(formData.eventType);
  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isInviteOnly = formData.eventType === EventType.INVITE;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

  // Update form data helper
  const updateFormData = (data: any) => {
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

      // Event type specific defaults
      if (updated.eventType === EventType.VOTING_CONTEST) {
        updated.isFree = true;
        if (!updated.votingContest) {
          updated.votingContest = {
            votingType: VotingType.FREE,
            votePackagesEnabled: false,
            allowGuestVoting: false,
            allowMultipleVotes: true,
            showLiveResults: true,
            showVoterNames: false,
            votePackages: [],
          };
        }
      }

      if (updated.eventType === EventType.INVITE) {
        updated.isFree = true;
        if (!updated.inviteOnly) {
          updated.inviteOnly = {
            allowPlusOnes: false,
            requireRSVP: true,
            sendAutoReminders: true,
            reminderDaysBefore: 7,
            acceptDonations: false,
            showDonorNames: true,
            isPrivate: true,
            requireApproval: false,
          };
        }
      }

      return updated;
    });
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else {
      setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
    }
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

      // Prepare base event data (without type-specific data)
      const eventData: any = {
        ...validatedData,
        eventType: formData.eventType,
        publishedStatus: publishStatus,
      };

      console.log('Submitting event data:', eventData);

      // Create the base event first
      const result = await createEvent(eventData);

      if (result.success && result.data) {
        const eventId = result.data.id;

        // Handle Voting Contest using specialized actions
        if (isVotingContest) {
          if (!formData.votingContest) {
            toast.error('Voting contest configuration is missing.');
            return;
          }

          console.log('Creating voting contest with data:', formData.votingContest);

          const contestResult = await createVotingContest({
            eventId,
            votingType: formData.votingContest.votingType,
            votePackagesEnabled:
              formData.votingContest.votePackagesEnabled || false,
            defaultVotePrice: formData.votingContest.defaultVotePrice,
            allowGuestVoting: formData.votingContest.allowGuestVoting || false,
            maxVotesPerUser: formData.votingContest.maxVotesPerUser,
            allowMultipleVotes:
              formData.votingContest.allowMultipleVotes !== false,
            showLiveResults: formData.votingContest.showLiveResults !== false,
            showVoterNames: formData.votingContest.showVoterNames || false,
          });

          if (!contestResult.success) {
            toast.error(contestResult.message || 'Failed to create voting contest');
            return;
          }

          const contestId = contestResult.data.id;
          console.log('Voting contest created with ID:', contestId);

          // Create contestants using specialized action
          if (
            formData.contestants &&
            Array.isArray(formData.contestants) &&
            formData.contestants.length > 0
          ) {
            console.log('Creating', formData.contestants.length, 'contestants');
            const contestantPromises = formData.contestants.map(
              async (contestant: any) => {
                if (!contestant.name || !contestant.contestNumber) {
                  return { success: false };
                }

                return createContestant({
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
            );

            await Promise.allSettled(contestantPromises);
          }

          // Create vote packages using specialized action
          if (
            formData.votingContest.votePackagesEnabled &&
            formData.votingContest.votePackages &&
            Array.isArray(formData.votingContest.votePackages)
          ) {
            console.log('Creating', formData.votingContest.votePackages.length, 'vote packages');
            const packagePromises = formData.votingContest.votePackages.map(
              async (pkg: any) => {
                if (!pkg.name || !pkg.voteCount || pkg.price === undefined) {
                  return { success: false };
                }

                return createVotePackage({
                  contestId,
                  name: pkg.name,
                  description: pkg.description || '',
                  voteCount: parseInt(pkg.voteCount, 10),
                  price: parseFloat(pkg.price),
                  sortOrder: parseInt(pkg.sortOrder, 10) || 0,
                });
              }
            );

            await Promise.allSettled(packagePromises);
          }
        }
        // Handle Invite-Only using specialized actions
        else if (isInviteOnly) {
          if (!formData.inviteOnly) {
            toast.error('Invite-only event configuration is missing.');
            return;
          }

          console.log('Creating invite-only event with data:', formData.inviteOnly);

          const inviteOnlyResult = await createInviteOnlyEvent({
            eventId,
            ...formData.inviteOnly,
          });

          if (!inviteOnlyResult.success) {
            toast.error(
              inviteOnlyResult.message || 'Failed to create invite-only configuration'
            );
            return;
          }

          const inviteOnlyEventId = inviteOnlyResult.data.id;
          console.log('Invite-only event created with ID:', inviteOnlyEventId);

          // Create invitations using specialized action
          if (
            formData.guests &&
            Array.isArray(formData.guests) &&
            formData.guests.length > 0
          ) {
            console.log('Creating', formData.guests.length, 'invitations');
            await bulkCreateInvitations({
              inviteOnlyEventId,
              guests: formData.guests.map((guest: any) => ({
                guestName: guest.guestName,
                guestEmail: guest.guestEmail,
                guestPhone: guest.guestPhone || '',
                plusOnesAllowed: guest.plusOnesAllowed || 0,
                specialRequirements: guest.specialRequirements || '',
                organizerNotes: guest.organizerNotes || '',
              })),
              sendEmails: false,
            });
          }
        }
        // Handle Standard Event - ticket types
        else if (isStandardEvent && ticketTypes.length > 0) {
          const ticketPromises = ticketTypes.map(async (ticketType) => {
            return createTicketType({
              name: ticketType.name,
              price: ticketType.price,
              quantity: ticketType.quantity,
              eventId: eventId,
            });
          });

          await Promise.allSettled(ticketPromises);
        }

        toast.success(result.message || 'Event created successfully');
        const redirectPath =
          userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
            ? '/admin/dashboard/events'
            : '/dashboard/events';

        router.push(redirectPath);
      } else {
        toast.error(result.message || 'Failed to create event');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error('Error creating event:', error);
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
          <EventTypeSelection
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 1:
        return (
          <EventBasicInfo
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <EventLocationDetails
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <EventSchedule
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        return (
          <EventMediaUpload
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 5:
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
              setTicketTypes={setTicketTypes}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          );
        }
      case 6:
        if (isVotingContest) {
          return (
            <ContestantManagement
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          );
        } else if (isInviteOnly) {
          return (
            <GuestManagement
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
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
              userRole={userRole}
              userSubRole={userSubRole}
            />
          );
        }
      case 7:
        return (
          <EventPreview
            formData={formData}
            ticketTypes={isVotingContest || isInviteOnly ? [] : ticketTypes}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
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