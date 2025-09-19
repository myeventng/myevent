'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { updateEvent } from '@/actions/event.actions';
import {
  updateVotingContest,
  createContestant,
  createVotePackage,
  getContestResults,
} from '@/actions/voting-contest.actions';
import {
  getTicketTypesByEvent,
  createTicketType,
  updateTicketType,
  deleteTicketType,
} from '@/actions/ticket.actions';
import { AgeRestriction, DressCode, EventType } from '@/generated/prisma';
import { toast } from 'sonner';
import { VotingType } from '@/generated/prisma';

// Step components
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
  embeddedVideoUrl: z.string().url().optional().or(z.literal('')),
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
  isEditing: boolean;
  userRole: string;
  userSubRole: string;
}

export function EditEventForm({
  initialData,
  isEditing,
  userRole,
  userSubRole,
}: EditEventFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isVotingContest = initialData?.eventType === EventType.VOTING_CONTEST;
  const steps = getStepsForEventType(
    initialData?.eventType || EventType.STANDARD
  );

  // Initialize form data from initialData
  useEffect(() => {
    if (initialData) {
      // Convert dates from strings to Date objects
      const startDateTime = new Date(initialData.startDateTime);
      const endDateTime = new Date(initialData.endDateTime);
      const lateEntry = initialData.lateEntry
        ? new Date(initialData.lateEntry)
        : undefined;

      const baseFormData = {
        eventType: initialData.eventType || EventType.STANDARD,
        title: initialData.title || '',
        description: initialData.description || '',
        categoryId: initialData.categoryId || undefined,
        tagIds: initialData.tags?.map((tag: any) => tag.id) || [],
        url: initialData.url || '',
        venueId: initialData.venueId || '',
        cityId: initialData.cityId || undefined,
        location: initialData.location || '',
        startDateTime,
        endDateTime,
        lateEntry,
        coverImageUrl: initialData.coverImageUrl || '',
        imageUrls: initialData.imageUrls || [],
        embeddedVideoUrl: initialData.embeddedVideoUrl || '',
      };

      if (isVotingContest) {
        setFormData({
          ...baseFormData,
          isFree: true, // Voting contests are always "free" events
          // FIX: Properly initialize voting contest data
          votingContest: initialData.votingContest
            ? {
                votingType: initialData.votingContest.votingType,
                votePackagesEnabled:
                  initialData.votingContest.votePackagesEnabled || false,
                defaultVotePrice: initialData.votingContest.defaultVotePrice,
                allowGuestVoting:
                  initialData.votingContest.allowGuestVoting || false,
                maxVotesPerUser: initialData.votingContest.maxVotesPerUser,
                allowMultipleVotes:
                  initialData.votingContest.allowMultipleVotes !== false,
                showLiveResults:
                  initialData.votingContest.showLiveResults !== false,
                showVoterNames:
                  initialData.votingContest.showVoterNames || false,
                votingStartDate: initialData.votingContest.votingStartDate
                  ? new Date(initialData.votingContest.votingStartDate)
                  : undefined,
                votingEndDate: initialData.votingContest.votingEndDate
                  ? new Date(initialData.votingContest.votingEndDate)
                  : undefined,
                votePackages: [], // Will be loaded separately
              }
            : {
                // Default voting contest structure
                votingType: VotingType.FREE,
                votePackagesEnabled: false,
                allowGuestVoting: false,
                allowMultipleVotes: true,
                showLiveResults: true,
                showVoterNames: false,
                votePackages: [],
              },
          contestants: [], // Will be loaded separately
        });
      } else {
        setFormData({
          ...baseFormData,
          age: initialData.age || undefined,
          dressCode: initialData.dressCode || undefined,
          isFree: initialData.isFree || false,
          idRequired: initialData.idRequired || false,
          attendeeLimit: initialData.attendeeLimit || undefined,
        });
      }
    }
  }, [initialData, isVotingContest]);

  // Fetch existing data based on event type - FIXED VERSION
  useEffect(() => {
    const fetchData = async () => {
      if (initialData?.id) {
        try {
          setIsLoading(true);

          if (isVotingContest && initialData.votingContest?.id) {
            // Fetch voting contest data
            const contestResults = await getContestResults(
              initialData.votingContest.id
            );
            if (contestResults.success && contestResults.data) {
              const contestData = contestResults.data.contest;
              const contestants = contestResults.data.results.map(
                (result: any) => ({
                  id: result.id,
                  name: result.name,
                  bio: result.bio || '',
                  imageUrl: result.imageUrl || '',
                  contestNumber: result.contestNumber,
                  instagramUrl: result.socialLinks?.instagram || '',
                  twitterUrl: result.socialLinks?.twitter || '',
                  facebookUrl: result.socialLinks?.facebook || '',
                  status: result.status || 'ACTIVE',
                })
              );

              // FIX: Update form data with proper merging
              setFormData((prev: any) => ({
                ...prev,
                votingContest: {
                  ...prev.votingContest,
                  ...contestData,
                  votePackages: contestResults.data.votePackages || [],
                  // Ensure dates are properly handled
                  votingStartDate: contestData.votingStartDate
                    ? new Date(contestData.votingStartDate)
                    : prev.votingContest?.votingStartDate,
                  votingEndDate: contestData.votingEndDate
                    ? new Date(contestData.votingEndDate)
                    : prev.votingContest?.votingEndDate,
                },
                contestants,
              }));
            }
          } else {
            // Fetch ticket types for standard events
            const response = await getTicketTypesByEvent(initialData.id);
            if (response.success && response.data) {
              setTicketTypes(response.data);
            }
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error(
            `Failed to load ${isVotingContest ? 'contest' : 'ticket'} data`
          );
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [initialData?.id, isVotingContest, initialData.votingContest?.id]);
  // Helper to update form data
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

      return updated;
    });
  };

  // Helper to handle next/previous step
  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  // Submit the event
  const handleSubmit = async (
    publishStatus: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' = 'DRAFT'
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

      // IMPORTANT: Include eventType in the update data
      const eventUpdateData = {
        id: initialData.id,
        ...validatedData,
        eventType: initialData.eventType, // Preserve the original eventType
        publishedStatus: publishStatus,
      };

      // Update the event
      const result = await updateEvent(eventUpdateData);

      if (result.success && result.data) {
        if (isVotingContest) {
          // Update voting contest
          if (formData.votingContest && initialData.votingContest?.id) {
            const contestResult = await updateVotingContest({
              contestId: initialData.votingContest.id,
              votingType: formData.votingContest.votingType,
              votePackagesEnabled: formData.votingContest.votePackagesEnabled,
              defaultVotePrice: formData.votingContest.defaultVotePrice,
              allowGuestVoting: formData.votingContest.allowGuestVoting,
              maxVotesPerUser: formData.votingContest.maxVotesPerUser,
              allowMultipleVotes: formData.votingContest.allowMultipleVotes,
              showLiveResults: formData.votingContest.showLiveResults,
              showVoterNames: formData.votingContest.showVoterNames,
            });

            if (!contestResult.success) {
              toast.error(
                contestResult.message || 'Failed to update voting contest'
              );
              return;
            }

            // FIX: Handle new contestants properly with better validation
            if (
              formData.contestants &&
              Array.isArray(formData.contestants) &&
              formData.contestants.length > 0
            ) {
              const newContestants = formData.contestants.filter(
                (c: any) => c.id?.startsWith('temp-contestant-') || !c.id
              );

              if (newContestants.length > 0) {
                const contestantPromises = newContestants.map(
                  async (contestant: any) => {
                    // Validate contestant data before creating
                    if (!contestant.name || !contestant.contestNumber) {
                      console.warn('Skipping invalid contestant:', contestant);
                      return {
                        success: false,
                        message: 'Invalid contestant data',
                      };
                    }

                    return createContestant({
                      contestId: initialData.votingContest.id,
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

                const contestantResults =
                  await Promise.allSettled(contestantPromises);
                const failedContestants = contestantResults.filter(
                  (result) =>
                    result.status === 'rejected' ||
                    (result.status === 'fulfilled' && !result.value.success)
                );

                if (failedContestants.length > 0) {
                  toast.error(
                    `Contest updated but ${failedContestants.length} new contestant(s) failed to create`
                  );
                }
              }
            }

            // FIX: Handle new vote packages properly with better validation
            if (
              formData.votingContest.votePackagesEnabled &&
              formData.votingContest.votePackages?.length > 0
            ) {
              const newPackages = formData.votingContest.votePackages.filter(
                (p: any) => p.id?.startsWith('temp-') || !p.id
              );

              if (newPackages.length > 0) {
                const packagePromises = newPackages.map(async (pkg: any) => {
                  // Validate package data before creating
                  if (!pkg.name || !pkg.voteCount || pkg.price === undefined) {
                    console.warn('Skipping invalid vote package:', pkg);
                    return { success: false, message: 'Invalid package data' };
                  }

                  return createVotePackage({
                    contestId: initialData.votingContest.id,
                    name: pkg.name,
                    description: pkg.description || '',
                    voteCount: parseInt(pkg.voteCount, 10),
                    price: parseFloat(pkg.price),
                    sortOrder: parseInt(pkg.sortOrder, 10) || 0,
                  });
                });

                const packageResults =
                  await Promise.allSettled(packagePromises);
                const failedPackages = packageResults.filter(
                  (result) =>
                    result.status === 'rejected' ||
                    (result.status === 'fulfilled' && !result.value.success)
                );

                if (failedPackages.length > 0) {
                  toast.error(
                    `Contest updated but ${failedPackages.length} new vote package(s) failed to create`
                  );
                }
              }
            }
          } else {
            toast.error('Voting contest data is missing');
            return;
          }
        } else {
          // Handle ticket types for standard events (existing logic remains the same)
          const existingTicketIds = ticketTypes
            .filter((t) => !t.id?.startsWith('temp-'))
            .map((t) => t.id);

          const newTicketTypes = ticketTypes.filter((t) =>
            t.id?.startsWith('temp-')
          );
          const updatedTicketTypes = ticketTypes.filter(
            (t) =>
              !t.id?.startsWith('temp-') && existingTicketIds.includes(t.id)
          );

          // Create new ticket types
          if (newTicketTypes.length > 0) {
            const createPromises = newTicketTypes.map(async (ticketType) => {
              return createTicketType({
                name: ticketType.name,
                price: ticketType.price,
                quantity: ticketType.quantity,
                eventId: initialData.id,
              });
            });

            await Promise.allSettled(createPromises);
          }

          // Update existing ticket types
          if (updatedTicketTypes.length > 0) {
            const updatePromises = updatedTicketTypes.map(
              async (ticketType) => {
                return updateTicketType({
                  id: ticketType.id,
                  name: ticketType.name,
                  price: ticketType.price,
                  quantity: ticketType.quantity,
                  eventId: initialData.id,
                });
              }
            );

            await Promise.allSettled(updatePromises);
          }
        }

        toast.success(
          result.message ||
            `${isVotingContest ? 'Contest' : 'Event'} updated successfully`
        );

        const redirectPath =
          userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
            ? '/admin/dashboard/events'
            : '/dashboard/events';

        router.push(redirectPath);
      } else {
        toast.error(
          result.message ||
            `Failed to update ${isVotingContest ? 'contest' : 'event'}`
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Display validation errors
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
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              Loading {isVotingContest ? 'contest' : 'event'} data...
            </p>
          </div>
        </div>
      );
    }

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
              setTicketTypes={setTicketTypes}
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
              isEditing={isEditing}
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
            isEditing={isEditing}
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
      <div>
        <h1 className="text-2xl font-bold">
          Edit {isVotingContest ? 'Voting Contest' : 'Event'}
        </h1>
        <p className="text-muted-foreground">
          Update your {isVotingContest ? 'contest' : 'event'} details using our
          step-by-step process.
        </p>
      </div>

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
