'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createEvent } from '@/actions/event.actions';
import { AgeRestriction, DressCode } from '@/generated/prisma';
import { toast } from 'sonner';

// Step components
import { EventBasicInfo } from './event-basic-info';
import { EventLocationDetails } from './event-location-details';
import { EventSchedule } from './event-schedule';
import { EventMediaUpload } from './event-media-upload';
import { EventTickets } from './event-tickets';
import { EventPreview } from './event-preview';

// Define the schema for form validation
const eventSchema = z.object({
  // Basic Info
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).min(1, 'Select at least one tag'),
  age: z.nativeEnum(AgeRestriction).optional(),
  dressCode: z.nativeEnum(DressCode).optional(),
  isFree: z.boolean().default(false),
  idRequired: z.boolean().default(false),
  attendeeLimit: z.number().optional(),
  url: z.string().url().optional().or(z.literal('')),

  // Location
  venueId: z.string().min(1, 'Venue is required'),
  cityId: z.string().optional(),
  location: z.string().optional(),

  // Schedule
  startDateTime: z.date(),
  endDateTime: z.date(),
  lateEntry: z.date().optional(),

  // Media
  coverImageUrl: z.string().min(1, 'Cover image is required'),
  imageUrls: z.array(z.string()).default([]),
  embeddedVideoUrl: z.string().optional().or(z.literal('')),
});

type EventFormValues = z.infer<typeof eventSchema>;

// Define the steps for the form
const steps = [
  { id: 'basic-info', title: 'Basic Info' },
  { id: 'location', title: 'Location' },
  { id: 'schedule', title: 'Schedule' },
  { id: 'media', title: 'Media' },
  { id: 'tickets', title: 'Tickets' },
  { id: 'preview', title: 'Preview' },
];

export function CreateEventForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<EventFormValues>>({
    tagIds: [],
    imageUrls: [],
    isFree: false,
    idRequired: false,
  });
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to update form data
  const updateFormData = (data: Partial<EventFormValues>) => {
    setFormData((prev) => ({ ...prev, ...data }));
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
    publishStatus: 'DRAFT' | 'PENDING_REVIEW' = 'DRAFT'
  ) => {
    try {
      setIsSubmitting(true);

      // Validate the form data
      const validatedData = eventSchema.parse(formData);

      // Create the event
      const result = await createEvent({
        ...validatedData,
        publishedStatus: publishStatus,
      });

      if (result.success && result.data) {
        toast.success(result.message || 'Event created successfully');

        // If we have ticket types, create them
        if (ticketTypes.length > 0 && result.data.id) {
          // Redirect to the ticket creation page with the event ID
          router.push(`/dashboard/events/${result.data.id}/tickets`);
        } else {
          // Redirect to the event details page
          router.push(`/dashboard/events`);
        }
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
        return (
          <EventTickets
            formData={formData}
            ticketTypes={ticketTypes}
            setTicketTypes={setTicketTypes}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 5:
        return (
          <EventPreview
            formData={formData}
            ticketTypes={ticketTypes}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex justify-between items-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
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
