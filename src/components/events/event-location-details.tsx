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
import { Textarea } from '@/components/ui/textarea';
import { getVenues } from '@/actions/venue-actions';
import { getUserVenues } from '@/actions/venue-actions';
import { toast } from 'sonner';
import { getUserOrganizerProfile } from '@/actions/organizer.actions';
import { Plus, Loader2, Globe, MapPin, Vote } from 'lucide-react';
import { CreateVenueModal } from './create-venue-modal';
import { EventType } from '@/generated/prisma';

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

  const isVotingContest = formData.eventType === EventType.VOTING_CONTEST;
  const isStandardEvent = formData.eventType === EventType.STANDARD;

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

          // Add online venue option for voting contests
          if (isVotingContest) {
            venueMap.set('online', {
              id: 'online',
              name: 'Online Event',
              address: 'Virtual/Online',
              city: { name: 'Online', state: 'Virtual' },
              isOwned: false,
              isOnline: true,
            });
          }

          setVenues(Array.from(venueMap.values()));
        } else {
          // Otherwise, get all venues (for admin users)
          venuesResponse = await getVenues();
          if (venuesResponse.success && venuesResponse.data) {
            const allVenues = venuesResponse.data.map((venue) => ({
              ...venue,
              isOwned: false,
            }));

            // Add online venue option for voting contests
            if (isVotingContest) {
              allVenues.unshift({
                id: 'online',
                name: 'Online Event',
                address: 'Virtual/Online',
                city: { name: 'Online', state: 'Virtual' },
                isOwned: false,
                isOnline: true,
              });
            }

            setVenues(allVenues);
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
  }, [formData.venueId, isVotingContest]);

  // Auto-select online venue for voting contests if none selected
  useEffect(() => {
    if (isVotingContest && !formData.venueId && venues.length > 0) {
      const onlineVenue = venues.find((v) => v.id === 'online');
      if (onlineVenue) {
        handleVenueChange('online');
      }
    }
  }, [isVotingContest, formData.venueId, venues]);

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
    let cityId = venue?.cityId || venue?.city?.id;

    // For online venues, set cityId to null
    if (venue?.isOnline) {
      cityId = undefined;
    }

    updateFormData({
      ...values,
      cityId, // Add the cityId from the selected venue
    });

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {isVotingContest ? (
            <Vote className="h-6 w-6 text-primary" />
          ) : (
            <MapPin className="h-6 w-6 text-primary" />
          )}
          <h2 className="text-2xl font-bold">
            {isVotingContest ? 'Contest Location' : 'Event Location'}
          </h2>
        </div>
        <p className="text-muted-foreground">
          {isVotingContest
            ? 'Voting contests are conducted online, but you can add additional location details if needed.'
            : 'Select the venue for your event or create a new one.'}
        </p>
      </div>

      {isVotingContest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Online Event</h3>
              <p className="text-sm text-blue-700 mt-1">
                Voting contests are conducted online. The "Online Event" venue
                has been automatically selected for you. You can provide
                additional details about the contest in the location field below
                if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="venueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isVotingContest ? 'Event Type' : 'Venue'}
                </FormLabel>
                <div className="space-y-3">
                  <Select
                    onValueChange={(value) => handleVenueChange(value)}
                    defaultValue={field.value}
                    disabled={
                      isLoading || (isVotingContest && field.value === 'online')
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isVotingContest
                              ? 'Online Event (Auto-selected)'
                              : 'Select a venue'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          <div className="flex items-center gap-2">
                            {venue.isOnline && (
                              <Globe className="h-4 w-4 text-blue-600" />
                            )}
                            <span>{venue.name}</span>
                            {venue.isOwned && !venue.isOnline && (
                              <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                Owned
                              </span>
                            )}
                            {!venue.isOnline && (
                              <span className="text-muted-foreground">
                                - {venue.city?.name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quick Venue Creation - Only for standard events */}
                  {isStandardEvent && (
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
                  )}
                </div>
                <FormDescription>
                  {isVotingContest
                    ? "Voting contests are conducted online and don't require a physical venue."
                    : 'Select the venue where your event will take place.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedVenue && (
            <div className="border rounded-md p-4 bg-muted/20">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                {selectedVenue.isOnline ? 'Event Type:' : 'Venue Details:'}
                {selectedVenue.isOwned && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Your Venue
                  </span>
                )}
                {selectedVenue.isOnline && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    Online
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <strong>Location:</strong> {selectedVenue.address}
                  </p>
                  {!selectedVenue.isOnline && (
                    <p>
                      <strong>City:</strong> {selectedVenue.city?.name},{' '}
                      {selectedVenue.city?.state}
                    </p>
                  )}
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
              {selectedVenue.description && !selectedVenue.isOnline && (
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
                <FormLabel>
                  {isVotingContest
                    ? 'Additional Contest Information'
                    : 'Additional Location Details'}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={
                      isVotingContest
                        ? 'Provide any additional information about the contest platform, voting instructions, or other relevant details...'
                        : 'Provide any additional location information...'
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {isVotingContest
                    ? 'Provide specific details about how the voting will work, any special instructions for voters, or other important contest information.'
                    : 'Provide specific details about the location, such as entry information, parking instructions, or specific room/area within the venue.'}
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

      {/* Create Venue Modal - Only show for standard events */}
      {isStandardEvent && (
        <CreateVenueModal
          isOpen={showCreateVenue}
          onClose={() => setShowCreateVenue(false)}
          onVenueCreated={handleVenueCreated}
        />
      )}
    </div>
  );
}
