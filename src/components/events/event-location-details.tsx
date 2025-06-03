'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getVenues } from '@/actions/venue-actions';
import { getUserVenues } from '@/actions/venue-actions';
import { toast } from 'sonner';
import { getUserOrganizerProfile } from '@/actions/organizer.actions';
import { Plus, Loader2 } from 'lucide-react';
import { CreateVenueModal } from './create-venue-modal';

// Form schema for this step
const formSchema = z.object({
  venueId: z.string().min(1, 'Venue is required'),
  location: z.string().optional(),
  cityId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EventLocationDetailsProps {
  formData: any;
  updateFormData: (data: Partial<FormValues>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function EventLocationDetails({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: EventLocationDetailsProps) {
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [showCreateVenue, setShowCreateVenue] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      venueId: formData.venueId || '',
      location: formData.location || '',
    },
  });

  // Fetch venues and check if user is an organizer
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Check if user is an organizer
        const profileResponse = await getUserOrganizerProfile();
        setIsOrganizer(!!profileResponse.data);

        let venuesResponse;

        if (profileResponse.data) {
          // If user is an organizer, get their venues plus all venues
          const [userVenuesRes, allVenuesRes] = await Promise.all([
            getUserVenues(),
            getVenues(),
          ]);

          // Combine and deduplicate venues
          const userVenues = userVenuesRes.success ? userVenuesRes.data : [];
          const allVenues = allVenuesRes.success ? allVenuesRes.data : [];

          // Create a map to avoid duplicates
          const venueMap = new Map();

          // Add user's venues first (they'll appear at the top)
          (userVenues ?? []).forEach((venue) => {
            venueMap.set(venue.id, { ...venue, isOwned: true });
          });

          // Add other venues
          (allVenues ?? []).forEach((venue) => {
            if (!venueMap.has(venue.id)) {
              venueMap.set(venue.id, { ...venue, isOwned: false });
            }
          });

          setVenues(Array.from(venueMap.values()));
        } else {
          // Otherwise, get all venues (for admin users)
          venuesResponse = await getVenues();
          if (venuesResponse.success && venuesResponse.data) {
            setVenues(
              venuesResponse.data.map((venue) => ({ ...venue, isOwned: false }))
            );
          }
        }

        // If we have a venueId in formData, set the selected venue
        if (formData.venueId) {
          const venue = Array.from(venues).find(
            (v: any) => v.id === formData.venueId
          );
          if (venue) {
            setSelectedVenue(venue);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load venues');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [formData.venueId]);

  // Update selected venue when venueId changes
  const handleVenueChange = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    setSelectedVenue(venue || null);
    form.setValue('venueId', venueId);
  };

  // Handle venue creation
  const handleVenueCreated = (newVenue: any) => {
    // Add the new venue to the list
    const venueWithOwnership = { ...newVenue, isOwned: true };
    setVenues((prev) => [venueWithOwnership, ...prev]);

    // Auto-select the newly created venue
    setSelectedVenue(venueWithOwnership);
    form.setValue('venueId', newVenue.id);

    toast.success('Venue created and selected!');
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Find the selected venue to get its city ID
    const venue = venues.find((venue) => venue.id === values.venueId);
    const cityId = venue?.cityId || venue?.city?.id;

    updateFormData({
      ...values,
      cityId, // Add the cityId from the selected venue
    });

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Location</h2>
        <p className="text-muted-foreground">
          Select the venue for your event or create a new one.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="venueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue</FormLabel>
                <div className="space-y-3">
                  <Select
                    onValueChange={(value) => handleVenueChange(value)}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          <div className="flex items-center gap-2">
                            <span>{venue.name}</span>
                            {venue.isOwned && (
                              <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                Owned
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              - {venue.city?.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quick Venue Creation */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateVenue(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create New Venue
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Can&apos;t find your venue? Create one!
                    </span>
                  </div>
                </div>
                <FormDescription>
                  Select the venue where your event will take place.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedVenue && (
            <div className="border rounded-md p-4 bg-muted/20">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Venue Details:
                {selectedVenue.isOwned && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Your Venue
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Address:</strong> {selectedVenue.address}
                  </p>
                  <p>
                    <strong>City:</strong> {selectedVenue.city?.name},{' '}
                    {selectedVenue.city?.state}
                  </p>
                </div>
                <div>
                  {selectedVenue.capacity && (
                    <p>
                      <strong>Capacity:</strong>{' '}
                      {selectedVenue.capacity.toLocaleString()} people
                    </p>
                  )}
                  {selectedVenue.contactInfo && (
                    <p>
                      <strong>Contact:</strong> {selectedVenue.contactInfo}
                    </p>
                  )}
                </div>
              </div>
              {selectedVenue.description && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm">{selectedVenue.description}</p>
                </div>
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Location Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide any additional location information..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide specific details about the location, such as entry
                  information, parking instructions, or specific room/area
                  within the venue.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>

      {/* Create Venue Modal */}
      <CreateVenueModal
        isOpen={showCreateVenue}
        onClose={() => setShowCreateVenue(false)}
        onVenueCreated={handleVenueCreated}
      />
    </div>
  );
}
