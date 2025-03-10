'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

// Custom Components
import SearchableVenueSelect from '../section/VenueSearch';
import { TagManager } from '@/components/section/TagManger';
import { FileUploader } from '@/components/section/FileUploader';
import { DateTimePicker } from '@/components/shared/DateTimePicker';

// Actions and Schema
import {
  createEvent,
  updateEvent,
  getEvent,
} from '@/lib/actions/event.actions';
import { getAllCategories } from '@/lib/actions/category.actions';
import { getAllVenuesForDropdown } from '@/lib/actions/event.actions';
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

// Props interface
interface EventFormProps {
  eventId?: string;
  userId?: string;
}

const EventForm = ({ eventId, userId }: EventFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: 'General Admission', price: 0, quantity: 100 },
  ]);
  const [imageFile, setImageFile] = useState<File[]>([]);
  const [coverImageFile, setCoverImageFile] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(!!eventId);

  // Initialize form
  const form = useForm<z.infer<typeof EventSchema>>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      imageUrl: '',
      coverImageUrl: '',
      startDateTime: new Date(),
      endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      isFree: true,
      url: '',
      categoryId: '',
      userId: userId,
      venueId: '',
      cityId: '',
      attendeeLimit: 100,
      featured: false,
      embeddedVideoUrl: '',
      isCancelled: false,
      publishedStatus: PublishedStatus.DRAFT as PublishedStatus,
      tags: [],
    },
  });

  // Load event data if editing
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        if (eventId) {
          const eventData = await getEvent(eventId);

          if (eventData) {
            // Set form values
            form.reset({
              ...eventData,
              startDateTime: new Date(eventData.startDateTime),
              endDateTime: new Date(eventData.endDateTime),
              tags: eventData.tags.map((tag) => tag.id),
            });

            // Set state values
            setImageUrl(eventData.imageUrl);
            setCoverImageUrl(eventData.coverImageUrl || '');
            setSelectedTags(eventData.tags.map((tag) => tag.id));

            // Set ticket types if they exist
            if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
              setTicketTypes(eventData.ticketTypes);
            }

            // Set venue info
            if (eventData.venue) {
              setSelectedVenue(eventData.venue);
            }
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching event data:', error);
        setIsLoading(false);
      }
    };

    // Fetch categories and venues
    Promise.all([getAllCategories(), getAllVenuesForDropdown()])
      .then(([categoriesData, venuesData]) => {
        setCategories(categoriesData);
        setVenues(venuesData);

        // Only fetch event data if we have the dependencies loaded
        if (eventId) {
          fetchEventData();
        }
      })
      .catch((error) => {
        console.error('Error fetching form dependencies:', error);
        setIsLoading(false);
      });
  }, [eventId, form]);

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

      // Optionally set the location field as well
      if (venue.address) {
        form.setValue('location', venue.address);
      }
    }
  };

  // Handle tag selection
  const handleTagsChange = (tagIds: string[]) => {
    setSelectedTags(tagIds);
    form.setValue('tags', tagIds);
  };

  // Handle ticket type changes
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

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof EventSchema>) => {
    try {
      setIsSubmitting(true);

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

      if (eventId) {
        // Update existing event
        await updateEvent(eventId, formData);
        router.push(`/events/${eventId}`);
      } else {
        // Create new event
        const newEvent = await createEvent(formData);
        router.push(`/events/${newEvent.id}`);
      }
    } catch (error) {
      console.error('Error submitting event:', error);
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
    <Form {...form}>
      <div className="relative">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6 relative">
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

              {/* External URL */}
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Link to your event's external page or registration site
                    </FormDescription>
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
            <div className="space-y-6 relative">
              {/* Main Image Upload */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Images</FormLabel>
                    <FormControl>
                      <FileUploader
                        onFieldChange={field.onChange}
                        imageUrl={imageUrl}
                        setFiles={setImageFile}
                        maxFiles={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cover Image Upload */}
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image (Optional)</FormLabel>
                    <FormControl>
                      <FileUploader
                        onFieldChange={field.onChange}
                        imageUrl={coverImageUrl}
                        setFiles={setCoverImageFile}
                        maxFiles={1}
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
                            <FormLabel className="text-xs">Price</FormLabel>
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
              {eventId && (
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {eventId ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
};

export default EventForm;
