'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createEvent, updateEvent, deleteEvent } from '@/actions/event.actions';
import { AgeRestriction, DressCode } from '@/generated/prisma';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, ArrowLeft } from 'lucide-react';

// Step components (reuse the existing ones)
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

interface EditEventFormProps {
  initialData?: any; // Existing event data for editing
  isEditing?: boolean;
  userRole: string;
  userSubRole: string;
}

export function EditEventForm({
  initialData,
  isEditing = false,
  userRole,
  userSubRole,
}: EditEventFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<EventFormValues>>({});
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin =
    userRole === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  // Initialize form data from existing event
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        categoryId: initialData.categoryId || undefined,
        tagIds: initialData.tags?.map((tag: any) => tag.id) || [],
        age: initialData.age || undefined,
        dressCode: initialData.dressCode || undefined,
        isFree: initialData.isFree || false,
        idRequired: initialData.idRequired || false,
        attendeeLimit: initialData.attendeeLimit || undefined,
        url: initialData.url || '',
        venueId: initialData.venueId || '',
        cityId: initialData.cityId || undefined,
        location: initialData.location || '',
        startDateTime: initialData.startDateTime
          ? new Date(initialData.startDateTime)
          : undefined,
        endDateTime: initialData.endDateTime
          ? new Date(initialData.endDateTime)
          : undefined,
        lateEntry: initialData.lateEntry
          ? new Date(initialData.lateEntry)
          : undefined,
        coverImageUrl: initialData.coverImageUrl || '',
        imageUrls: initialData.imageUrls || [],
        embeddedVideoUrl: initialData.embeddedVideoUrl || '',
      });

      // Set ticket types if they exist
      if (initialData.ticketTypes && initialData.ticketTypes.length > 0) {
        setTicketTypes(
          initialData.ticketTypes.map((ticket: any) => ({
            id: ticket.id,
            name: ticket.name,
            price: ticket.price,
            quantity: ticket.quantity,
          }))
        );
      }
    } else {
      // Initialize with default values for creating new event
      setFormData({
        tagIds: [],
        imageUrls: [],
        isFree: false,
        idRequired: false,
      });
    }
  }, [isEditing, initialData]);

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

  // Handle going back to events list
  const handleGoBack = () => {
    const redirectPath = isAdmin
      ? '/admin/dashboard/events'
      : '/dashboard/events';
    router.push(redirectPath);
  };

  // Submit the event (create or update)
  const handleSubmit = async (
    publishStatus: 'DRAFT' | 'PENDING_REVIEW' = 'DRAFT'
  ) => {
    try {
      setIsSubmitting(true);

      // Validate the form data
      const validatedData = eventSchema.parse(formData);

      let result;
      if (isEditing && initialData?.id) {
        // Update existing event
        result = await updateEvent({
          id: initialData.id,
          ...validatedData,
          publishedStatus: publishStatus,
        });
      } else {
        // Create new event
        result = await createEvent({
          ...validatedData,
          publishedStatus: publishStatus,
        });
      }

      if (result.success && result.data) {
        toast.success(
          result.message ||
            `Event ${isEditing ? 'updated' : 'created'} successfully`
        );

        // If we have ticket types and this is a new event, redirect to ticket creation
        if (!isEditing && ticketTypes.length > 0 && result.data.id) {
          router.push(`/dashboard/events/${result.data.id}/tickets`);
        } else {
          // Redirect to the event details or events list
          const redirectPath = isAdmin ? '/admin/events' : '/dashboard/events';
          router.push(redirectPath);
        }
      } else {
        toast.error(
          result.message || `Failed to ${isEditing ? 'update' : 'create'} event`
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Display validation errors
        error.errors.forEach((err) => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error(
          `Error ${isEditing ? 'updating' : 'creating'} event:`,
          error
        );
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async () => {
    if (!isEditing || !initialData?.id) return;

    try {
      const result = await deleteEvent(initialData.id);
      if (result.success) {
        toast.success(result.message || 'Event deleted successfully');
        const redirectPath = isAdmin ? '/admin/events' : '/dashboard/events';
        router.push(redirectPath);
      } else {
        toast.error(result.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
    setShowDeleteDialog(false);
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
      {/* Header with navigation and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit Event' : 'Create Event'}
            </h1>
            {isEditing && initialData?.title && (
              <p className="text-muted-foreground">{initialData.title}</p>
            )}
          </div>
        </div>

        {/* Delete button for editing */}
        {isEditing && (
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this event? This action cannot
                  be undone.
                  {initialData?.orders?.length > 0 ||
                  initialData?.ticketTypes?.some(
                    (t: any) => t.tickets?.length > 0
                  )
                    ? ' The event will be cancelled instead of deleted because it has associated orders or tickets.'
                    : ' This will permanently delete the event and all associated data.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteEvent}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {initialData?.orders?.length > 0 ||
                  initialData?.ticketTypes?.some(
                    (t: any) => t.tickets?.length > 0
                  )
                    ? 'Cancel Event'
                    : 'Delete Event'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

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

      {/* Event status information for editing */}
      {isEditing && initialData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-4">
                <span>
                  Status:{' '}
                  <strong>
                    {initialData.publishedStatus?.replace('_', ' ')}
                  </strong>
                </span>
                {initialData.isCancelled && (
                  <span className="text-destructive font-medium">
                    Event Cancelled
                  </span>
                )}
                {initialData.featured && (
                  <span className="text-primary font-medium">
                    Featured Event
                  </span>
                )}
              </div>
              <div className="text-muted-foreground">
                Created: {new Date(initialData.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
