'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Trash } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Custom Components
import SearchableVenueSelect from '../section/VenueSearch';
import { TagManager } from '@/components/section/TagManger';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { FileUploader } from '@/components/section/FileUploader';

// Actions and Schema
import {
  createEvent,
  updateEvent,
  getEvent,
  getAllVenuesForDropdown,
} from '@/lib/actions/event.actions';
import { getAllCategories } from '@/lib/actions/category.actions';
import { EventSchema } from '@/schemas';

// Types
import { Category, Event, PublishedStatus, Venue } from '@prisma/client';

// Define TicketType interface
interface TicketType {
  id?: string;
  name: string;
  price: number;
  quantity: number;
}

// Props interface for EventForm
interface EventFormProps {
  initialData?:
    | (Event & {
        venue: Venue;
        category?: Category;
        tags: { id: string }[];
        ticketTypes: TicketType[];
      })
    | null;
  userId?: string;
}

const EventForm = ({ initialData, userId }: EventFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: 'General Admission', price: 0, quantity: 100 },
  ]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [coverImageFiles, setCoverImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialData?.imageUrls || []
  );
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Initialize form with type-safe default values
  const form = useForm<z.infer<typeof EventSchema>>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrls: Array.isArray(initialData?.imageUrls)
        ? initialData.imageUrls
        : [],
      coverImageUrl: initialData?.coverImageUrl || '',
      startDateTime: initialData?.startDateTime
        ? new Date(initialData.startDateTime)
        : new Date(),
      endDateTime: initialData?.endDateTime
        ? new Date(initialData.endDateTime)
        : new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      isFree: initialData?.isFree ?? true,
      categoryId: initialData?.categoryId || '',
      userId: userId || initialData?.userId || '',
      venueId: initialData?.venueId || '',
      cityId: initialData?.cityId || '',
      attendeeLimit: initialData?.attendeeLimit || 100,
      featured: initialData?.featured || false,
      embeddedVideoUrl: initialData?.embeddedVideoUrl || '',
      isCancelled: initialData?.isCancelled || false,
      publishedStatus: initialData?.publishedStatus || PublishedStatus.DRAFT,
      tags: initialData?.tags?.map((tag) => tag.id) || [],
    },
  });

  // Load dependencies (categories and venues)
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [categoriesData, venuesData] = await Promise.all([
          getAllCategories(),
          getAllVenuesForDropdown(),
        ]);

        setCategories(categoriesData);
        setVenues(venuesData);

        // Initialize state from initial data if available
        if (initialData) {
          // Set image URLs from initialData
          setImageUrls(initialData.imageUrls);
          if (initialData.coverImageUrl) {
            setCoverImageUrl(initialData.coverImageUrl);
          }

          // Set selected venue
          if (initialData.venue) {
            setSelectedVenue(initialData.venue);
          }

          // Set selected tags
          if (initialData.tags?.length > 0) {
            setSelectedTags(initialData.tags.map((tag) => tag.id));
          }

          // Set ticket types
          if (initialData.ticketTypes?.length > 0) {
            setTicketTypes(initialData.ticketTypes);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching form dependencies:', error);
        toast.error('Failed to load form data');
        setIsLoading(false);
      }
    };

    fetchDependencies();
  }, [initialData]);

  useEffect(() => {
    // Add this validation check
    if (imageUrls.length > 0) {
      form.setValue('imageUrls', imageUrls);
    }
  }, [imageUrls]);

  // Also ensure venueId is properly set
  useEffect(() => {
    if (selectedVenue?.id) {
      form.setValue('venueId', selectedVenue.id);
    }
  }, [selectedVenue]);

  // Handle venue selection
  const handleVenueSelect = (venueId: string) => {
    form.setValue('venueId', venueId);

    // Find the selected venue
    const venue = venues.find((v) => v.id === venueId);
    if (venue) {
      setSelectedVenue(venue);

      // Set the cityId based on venue
      if (venue.cityId) {
        form.setValue('cityId', venue.cityId);
      }
    }
  };

  // Handle tag selection
  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTags(tagIds);
    form.setValue('tags', tagIds);
  };

  // Ticket type management
  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: 0, quantity: 0 }]);
  };

  const updateTicketType = (
    index: number,
    field: keyof TicketType,
    value: string | number
  ) => {
    const updatedTicketTypes = [...ticketTypes];
    updatedTicketTypes[index] = {
      ...updatedTicketTypes[index],
      [field]: field === 'name' ? value : Number(value),
    };
    setTicketTypes(updatedTicketTypes);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  // Form submission
  // In the onSubmit function in EventForm.tsx
  const onSubmit = async (values: z.infer<typeof EventSchema>) => {
    console.log('Form submission started');
    // Add this validation check
    try {
      // Validate against schema directly
      EventSchema.parse(values);
    } catch (error) {
      console.error('Schema validation failed:', error);
      toast.error('Please fix form errors before submitting');
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      console.error('Form validation failed', form.formState.errors);
      toast.error('Please fix form errors before submitting');
      return;
    }
    try {
      setIsSubmitting(true);
      console.log('isSubmitting set to true');
      console.log('Form values before submission:', values);

      // Process form values
      const formData = {
        ...values,
        tags: selectedTags,
        ticketTypes: ticketTypes.map((ticket) => ({
          name: ticket.name,
          price: ticket.price,
          quantity: ticket.quantity,
          id: ticket.id,
        })),
      };

      console.log('Processed form data:', formData);

      // Update or create
      if (initialData?.id) {
        console.log('Updating event with ID:', initialData.id);
        const result = await updateEvent(initialData.id, formData);
        console.log(form.formState.errors);
        console.log('Update result:', result);
        toast.success('Event updated successfully');
        router.push(`/events/${initialData.id}`);
      } else {
        console.log('Creating new event');
        const newEvent = await createEvent(formData);
        console.log('Create result:', newEvent);
        toast.success('Event created successfully');
        router.push(`/events/${newEvent.id}`);
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        toast.error(`Failed to save event: ${error.message}`);
      } else {
        toast.error('Failed to save event: Unknown error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading event data...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            console.log('Form submit event triggered');
            const formIsValid = form.formState.isValid;
            console.log('Form is valid:', formIsValid);
            console.log('Form errors:', form.formState.errors);

            form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              {/* Event Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Event Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write about your event..."
                        className="resize-none min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Venue Selection */}
              <FormItem>
                <SearchableVenueSelect
                  venues={venues}
                  value={form.getValues('venueId')}
                  onChange={handleVenueSelect}
                  disabled={isSubmitting}
                  placeholder="Search and select a venue"
                  error={form.formState.errors.venueId?.message}
                />
                <FormMessage>
                  {form.formState.errors.venueId?.message}
                </FormMessage>
              </FormItem>

              {/* Category Selection */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder="Select category"
                            className="text-black"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="text-black">
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          date={field.value}
                          setDate={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          date={field.value}
                          setDate={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Attendee Limit */}
              <FormField
                control={form.control}
                name="attendeeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendee Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter maximum attendees"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : parseInt(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Embedded Video URL */}
              <FormField
                control={form.control}
                name="embeddedVideoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/..." {...field} />
                    </FormControl>
                    <FormDescription>
                      YouTube or Vimeo URL to embed on your event page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              {/* Cover Image */}
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cover Image{' '}
                      <small className="text-red-500">
                        ( for a better representation use a aspect ratio of 16:9
                        )
                      </small>
                    </FormLabel>
                    <FormControl>
                      <FileUploader
                        onFieldChange={(url) => {
                          console.log(
                            '[EventForm] Received cover image URL from FileUploader:',
                            url
                          );

                          field.onChange(url);
                          setCoverImageUrl(url);
                          console.log(
                            '[EventForm] Updated form field with URL:',
                            form.getValues('coverImageUrl')
                          );
                        }}
                        imageUrls={coverImageUrl}
                        setFiles={setCoverImageFiles}
                        maxFiles={1}
                        endpoint="eventCover"
                        multipleImages={false} // Keep cover image as single image
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Images</FormLabel>
                    <FormControl>
                      <FileUploader
                        onFieldChange={(urls) => {
                          console.log(
                            '[EventForm] Received image URLs from FileUploader:',
                            urls
                          );
                          // Handle both string and string[] types
                          if (Array.isArray(urls)) {
                            field.onChange(urls); // Store as array in form
                            setImageUrls(urls); // Store as array in state
                          } else if (urls) {
                            field.onChange([urls]); // Single URL as array with one item
                            setImageUrls([urls]); // Store as array in state with single item
                          } else {
                            field.onChange([]); // Empty array for empty value
                            setImageUrls([]);
                          }
                          console.log(
                            '[EventForm] Updated form field with URLs:',
                            form.getValues('imageUrls')
                          );
                        }}
                        imageUrls={imageUrls}
                        setFiles={setImageFiles}
                        maxFiles={10}
                        endpoint="eventImage"
                        multipleImages={true} // Enable multiple image mode
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <div className="mt-2">
                  <TagManager
                    selectedTags={selectedTags}
                    onTagsChange={handleTagsChange}
                    disabled={isSubmitting}
                  />
                </div>
                <FormMessage>{form.formState.errors.tags?.message}</FormMessage>
              </FormItem>
              {/* Ticket Types */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Ticket Types</FormLabel>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addTicketType}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Ticket
                  </Button>
                </div>

                {/* Free Event Toggle */}
                <FormField
                  control={form.control}
                  name="isFree"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Free Event
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Ticket Types List */}
                <div className="space-y-3">
                  {ticketTypes.map((ticket, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-10 gap-3">
                          <div className="col-span-10 sm:col-span-4">
                            <FormLabel className="text-xs">Name</FormLabel>
                            <Input
                              value={ticket.name}
                              onChange={(e) =>
                                updateTicketType(index, 'name', e.target.value)
                              }
                              placeholder="Ticket name"
                              className="mt-1"
                              disabled={
                                isSubmitting || form.getValues('isFree')
                              }
                            />
                          </div>
                          <div className="col-span-5 sm:col-span-2">
                            <FormLabel className="text-xs">Price (₦)</FormLabel>
                            <Input
                              type="number"
                              value={ticket.price}
                              onChange={(e) =>
                                updateTicketType(index, 'price', e.target.value)
                              }
                              placeholder="Price"
                              className="mt-1"
                              disabled={
                                isSubmitting || form.getValues('isFree')
                              }
                            />
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <FormLabel className="text-xs">Quantity</FormLabel>
                            <Input
                              type="number"
                              value={ticket.quantity}
                              onChange={(e) =>
                                updateTicketType(
                                  index,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              placeholder="Quantity"
                              className="mt-1"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className="col-span-10 sm:col-span-1 flex items-end justify-end">
                            {index > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTicketType(index)}
                                disabled={isSubmitting}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              {/* Featured and Publishing Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Featured Event
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publishedStatus"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PENDING_REVIEW">
                            Submit for Review
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              {/* Is Cancelled (for existing events) */}
              {initialData?.id && (
                <FormField
                  control={form.control}
                  name="isCancelled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-destructive">
                        Cancel Event
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => console.log('Button clicked')}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EventForm;
