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
import { createTicketType } from '@/actions/ticket.actions';
import { AgeRestriction, DressCode, EventType } from '@/generated/prisma';
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
import { EventPreview } from './event-preview';

// Base schema for all events
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

// Extended schema for standard events
const standardEventSchema = baseEventSchema.extend({
  age: z.nativeEnum(AgeRestriction).optional(),
  dressCode: z.nativeEnum(DressCode).optional(),
  isFree: z.boolean().default(false),
  idRequired: z.boolean().default(false),
  attendeeLimit: z.number().optional(),
});

// Schema for voting contest events (simplified)
const votingContestEventSchema = baseEventSchema.extend({
  // Voting contests are always free in terms of event tickets
  // Voting itself may be paid, but handled separately
  isFree: z.literal(true).default(true),
  // No age restrictions, dress codes, etc. for voting contests
});

type BaseEventFormValues = z.infer<typeof baseEventSchema>;
type StandardEventFormValues = z.infer<typeof standardEventSchema>;
type VotingContestEventFormValues = z.infer<typeof votingContestEventSchema>;

// Define the steps for different event types
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

  // Helper to update form data - ensure no undefined values
  const updateFormData = (data: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, ...data };

      // Ensure arrays are never undefined
      if (!updated.tagIds) updated.tagIds = [];
      if (!updated.imageUrls) updated.imageUrls = [];

      // Ensure strings are never undefined
      if (updated.title === undefined) updated.title = '';
      if (updated.description === undefined) updated.description = '';
      if (updated.location === undefined) updated.location = '';
      if (updated.coverImageUrl === undefined) updated.coverImageUrl = '';
      if (updated.url === undefined) updated.url = '';
      if (updated.embeddedVideoUrl === undefined) updated.embeddedVideoUrl = '';

      // For voting contests, ensure certain defaults
      if (updated.eventType === EventType.VOTING_CONTEST) {
        updated.isFree = true; // Voting contests are always "free" events
      }

      return updated;
    });
  };

  // Helper to handle next/previous step
  const handleNext = () => {
    // Special handling when event type changes
    if (currentStep === 0) {
      // Reset step to 0 if event type changed to rebuild flow
      const newSteps = getStepsForEventType(formData.eventType);
      setCurrentStep(1); // Move to basic info
    } else {
      setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  // Submit the event
  const handleSubmit = async (
    publishStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED'
  ) => {
    try {
      setIsSubmitting(true);

      // Validate based on event type
      let validatedData;
      if (isVotingContest) {
        validatedData = votingContestEventSchema.parse(formData);
      } else {
        validatedData = standardEventSchema.parse(formData);
      }

      const eventData = {
        ...validatedData,
        eventType: formData.eventType,
        publishedStatus: publishStatus,
      };

      // Create the event
      const result = await createEvent(eventData);

      if (result.success && result.data) {
        const eventId = result.data.id;

        if (isVotingContest) {
          // Create voting contest
          if (formData.votingContest) {
            const contestResult = await createVotingContest({
              eventId,
              ...formData.votingContest,
            });

            if (!contestResult.success) {
              toast.error(
                contestResult.message || 'Failed to create voting contest'
              );
              return;
            }
          }
        } else {
          // Create ticket types for standard events
          if (ticketTypes.length > 0) {
            const ticketPromises = ticketTypes.map(async (ticketType) => {
              return createTicketType({
                name: ticketType.name,
                price: ticketType.price,
                quantity: ticketType.quantity,
                eventId: eventId,
              });
            });

            const ticketResults = await Promise.all(ticketPromises);

            // Check if all ticket types were created successfully
            const failedTickets = ticketResults.filter((r) => !r.success);
            if (failedTickets.length > 0) {
              toast.error(
                `Event created but ${failedTickets.length} ticket type(s) failed to create`
              );
            }
          }
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
        // Display validation errors
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

  // Render the current step
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
        // This will be the preview step for voting contests
        return (
          <EventPreview
            formData={formData}
            ticketTypes={isVotingContest ? [] : ticketTypes}
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
              className={`rounded-full h-10 w-10 flex items-center justify-center ${
                index < currentStep
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
                  className={`h-full ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
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
