'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateEvent } from '@/actions/event.actions';
import {
  getContestResults,
  updateContestant,
  deleteContestant,
  createContestant,
  updateVotePackages,
} from '@/actions/voting-contest.actions';
import {
  updateTicketType,
  deleteTicketType,
  createTicketType,
  getTicketTypesByEvent,
} from '@/actions/ticket.actions';
import { AgeRestriction, DressCode, EventType } from '@/generated/prisma';
import { toast } from 'sonner';

// Step components (reuse existing ones)
import { EventBasicInfo } from './event-basic-info';
import { EventLocationDetails } from './event-location-details';
import { EventSchedule } from './event-schedule';
import { EventMediaUpload } from './event-media-upload';
import { EventTickets } from './event-tickets';
import { VotingContestSetup } from './voting-contest-setup';
import { ContestantManagement } from './contestant-management';
import { EventPreview } from './event-preview';
import { VotingType } from '@/generated/prisma';

// Base schema for all events
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

// Extended schema for standard events
const standardEventSchema = baseEventSchema.extend({
  age: z.nativeEnum(AgeRestriction).optional(),
  dressCode: z.nativeEnum(DressCode).optional(),
  isFree: z.boolean().default(false),
  idRequired: z.boolean().default(false),
  attendeeLimit: z.number().optional(),
});

// Schema for voting contest events
const votingContestEventSchema = baseEventSchema.extend({
  isFree: z.literal(true).default(true),
});

type BaseEventFormValues = z.infer<typeof baseEventSchema>;
type StandardEventFormValues = z.infer<typeof standardEventSchema>;
type VotingContestEventFormValues = z.infer<typeof votingContestEventSchema>;

// Define the steps for different event types
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
  const eventData = initialData; // For consistency with existing code
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>(() => {
    console.log('=== INITIALIZING EDIT FORM ===');
    console.log('Event data received:', eventData);
    console.log('eventData.contestants:', eventData.contestants);
    console.log(
      'eventData.votingContest?.contestants:',
      eventData.votingContest?.contestants
    );

    // FIXED: Get contestants from the correct location
    // The admin page puts contestants at root level (eventData.contestants)
    // as well as nested in votingContest for backwards compatibility
    const contestantsFromRoot = eventData.contestants || [];
    const contestantsFromVotingContest =
      eventData.votingContest?.contestants || [];

    // Use contestants from root level (which should be populated by admin page)
    // If not available, fall back to nested contestants
    const contestants =
      contestantsFromRoot.length > 0
        ? contestantsFromRoot
        : contestantsFromVotingContest;

    console.log('Final contestants used:', contestants);
    console.log('Contestants count:', contestants.length);

    // Initialize form data with existing event data
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
      lateEntry: eventData.lateEntry
        ? new Date(eventData.lateEntry)
        : undefined,
      // Standard event fields
      age: eventData.age,
      dressCode: eventData.dressCode,
      isFree: eventData.isFree || false,
      idRequired: eventData.idRequired || false,
      attendeeLimit: eventData.attendeeLimit,
      // Voting contest data
      votingContest: eventData.votingContest
        ? {
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
      // FIXED: Use contestants from the correct source
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
    };

    console.log(
      'Initialized form data contestants:',
      initialFormData.contestants
    );
    console.log('Initialized form data:', initialFormData);
    return initialFormData;
  });

  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [originalTicketTypes, setOriginalTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedContestants, setDeletedContestants] = useState<string[]>([]);
  const [deletedTicketTypes, setDeletedTicketTypes] = useState<string[]>([]);

  const steps = getStepsForEventType(formData.eventType);
  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;

  // Debug effect to monitor formData changes
  useEffect(() => {
    console.log('=== FORM DATA UPDATED ===');
    console.log('formData.contestants:', formData.contestants);
    console.log(
      'formData.contestants.length:',
      formData.contestants?.length || 0
    );
    if (formData.contestants && formData.contestants.length > 0) {
      console.log(
        'Contestant names:',
        formData.contestants.map((c: any) => c.name)
      );
    }
  }, [formData.contestants]);

  // Load existing ticket types for standard events
  useEffect(() => {
    const loadTicketTypes = async () => {
      if (!isVotingContest && eventData.id) {
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
  }, [eventData.id, isVotingContest]);

  // Helper to update form data
  const updateFormData = (data: any) => {
    console.log('=== UPDATE FORM DATA CALLED ===');
    console.log('Update data received:', data);

    setFormData((prev: any) => {
      const updated = { ...prev };

      // Handle deep merging for nested objects like votingContest
      Object.keys(data).forEach((key) => {
        if (
          key === 'votingContest' &&
          typeof data[key] === 'object' &&
          data[key] !== null
        ) {
          updated[key] = {
            ...updated[key],
            ...data[key],
          };
        } else if (key === 'contestants' && Array.isArray(data[key])) {
          console.log('Updating contestants array:', data[key]);
          updated[key] = [...data[key]];
        } else {
          updated[key] = data[key];
        }
      });

      // Ensure arrays are never undefined
      if (!updated.tagIds) updated.tagIds = [];
      if (!updated.imageUrls) updated.imageUrls = [];
      if (!updated.contestants) updated.contestants = [];

      // Ensure strings are never undefined
      if (updated.title === undefined) updated.title = '';
      if (updated.description === undefined) updated.description = '';
      if (updated.location === undefined) updated.location = '';
      if (updated.coverImageUrl === undefined) updated.coverImageUrl = '';
      if (updated.url === undefined) updated.url = '';
      if (updated.embeddedVideoUrl === undefined) updated.embeddedVideoUrl = '';

      console.log('Updated form data:', updated);
      console.log('Updated contestants:', updated.contestants);
      return updated;
    });
  };

  // Custom ticket management for edit mode
  const handleTicketTypeChange = (tickets: any[], deleted: string[] = []) => {
    setTicketTypes(tickets);
    setDeletedTicketTypes((prev) => [...new Set([...prev, ...deleted])]);
  };

  // Custom contestant management for edit mode
  const handleContestantDelete = (contestantId: string) => {
    if (contestantId && !contestantId.startsWith('temp-')) {
      setDeletedContestants((prev) => [...prev, contestantId]);
    }
  };

  // Helper to handle next/previous step
  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  // Submit the updated event

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

      // Prepare event update data
      const eventUpdateData = {
        ...validatedData,
        eventType: formData.eventType,
        publishedStatus: publishStatus,
        // Include voting contest data for voting contests
        ...(isVotingContest && {
          votingContest: formData.votingContest,
          contestants: formData.contestants,
        }),
      };

      console.log('Updating event with data:', eventUpdateData);

      // Update the main event
      const result = await updateEvent(eventUpdateData);

      if (result.success && result.data) {
        const eventId = result.data.id;

        // Handle standard event ticket type operations
        if (!isVotingContest) {
          try {
            // Process deleted ticket types first
            for (const deletedId of deletedTicketTypes) {
              if (!deletedId.startsWith('temp-')) {
                try {
                  const deleteResult = await deleteTicketType(deletedId);
                  if (!deleteResult.success) {
                    console.warn(
                      'Failed to delete ticket type:',
                      deletedId,
                      deleteResult.message
                    );
                    toast.error(
                      `Failed to delete ticket type: ${deleteResult.message}`
                    );
                  }
                } catch (error) {
                  console.warn('Error deleting ticket type:', deletedId, error);
                }
              }
            }

            // Process remaining ticket types (create new ones and update existing ones)
            for (const ticketType of ticketTypes) {
              if (!ticketType.name || ticketType.quantity <= 0) {
                console.warn('Skipping invalid ticket type:', ticketType);
                continue;
              }

              try {
                if (ticketType.id && !ticketType.id.startsWith('temp-')) {
                  // Update existing ticket type
                  console.log(
                    'Updating existing ticket type:',
                    ticketType.name
                  );
                  const updateResult = await updateTicketType({
                    id: ticketType.id,
                    eventId,
                    name: ticketType.name,
                    price: parseFloat(ticketType.price.toString()),
                    quantity: parseInt(ticketType.quantity.toString(), 10),
                  });

                  if (!updateResult.success) {
                    console.warn(
                      'Failed to update ticket type:',
                      ticketType.name,
                      updateResult.message
                    );
                    toast.error(
                      `Failed to update ticket type "${ticketType.name}": ${updateResult.message}`
                    );
                  }
                } else {
                  // Create new ticket type
                  console.log('Creating new ticket type:', ticketType.name);
                  const createResult = await createTicketType({
                    eventId,
                    name: ticketType.name,
                    price: parseFloat(ticketType.price.toString()),
                    quantity: parseInt(ticketType.quantity.toString(), 10),
                  });

                  if (!createResult.success) {
                    console.warn(
                      'Failed to create ticket type:',
                      ticketType.name,
                      createResult.message
                    );
                    toast.error(
                      `Failed to create ticket type "${ticketType.name}": ${createResult.message}`
                    );
                  }
                }
              } catch (error) {
                console.warn(
                  'Error processing ticket type:',
                  ticketType.name,
                  error
                );
                toast.error(
                  `Error processing ticket type "${ticketType.name}"`
                );
              }
            }
          } catch (ticketError) {
            console.error('Error handling ticket types:', ticketError);
            // Don't fail the entire update for ticket type issues
          }
        }

        // Handle voting contest operations (existing code)
        else if (isVotingContest && formData.votingContest) {
          try {
            // Get the voting contest ID
            const contestId =
              eventData.votingContest?.id ||
              (await getContestResults(eventId)).data?.contest?.id;

            if (contestId) {
              // Handle contestant updates/creation/deletion
              if (formData.contestants && Array.isArray(formData.contestants)) {
                console.log(
                  'Processing contestants for save:',
                  formData.contestants
                );

                // Delete removed contestants first
                for (const deletedId of deletedContestants) {
                  try {
                    await deleteContestant(deletedId);
                  } catch (error) {
                    console.warn(
                      'Failed to delete contestant:',
                      deletedId,
                      error
                    );
                  }
                }

                // Process remaining contestants
                for (const contestant of formData.contestants) {
                  if (!contestant.name || !contestant.contestNumber) {
                    console.warn('Skipping invalid contestant:', contestant);
                    continue;
                  }

                  try {
                    if (contestant.id && !contestant.id.startsWith('temp-')) {
                      // Update existing contestant
                      console.log(
                        'Updating existing contestant:',
                        contestant.name
                      );
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
                      // Create new contestant
                      console.log('Creating new contestant:', contestant.name);
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
                  } catch (error) {
                    console.warn(
                      'Failed to process contestant:',
                      contestant.name,
                      error
                    );
                  }
                }
              }

              // Update vote packages if enabled
              if (
                formData.votingContest.votePackagesEnabled &&
                formData.votingContest.votePackages
              ) {
                try {
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
                } catch (error) {
                  console.warn('Failed to update vote packages:', error);
                }
              }
            }
          } catch (contestError) {
            console.error(
              'Error handling voting contest details:',
              contestError
            );
            // Don't fail the entire update for voting contest details
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

  // Render the current step
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
        // This will be the preview step for voting contests
        return (
          <EventPreview
            formData={formData}
            ticketTypes={isVotingContest ? [] : ticketTypes}
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
