'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin } from 'lucide-react';
import { createVenue } from '@/actions/venue-actions';
import { getCities } from '@/actions/city-actions';
import { toast } from 'sonner';
import { City } from '@/generated/prisma';
import { VenueWithCity, VenueWithCityAndUser } from '@/types';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Venue name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  cityId: z.string().min(1, 'City is required'),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  capacity: z.coerce
    .number()
    .positive('Capacity must be a positive number')
    .optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueCreated: (venue: VenueWithCity | VenueWithCityAndUser) => void;
  cities: City[];
}

export const CreateVenueModal = ({
  isOpen,
  onClose,
  onVenueCreated,
}: CreateVenueModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
      cityId: '',
      description: '',
      contactInfo: '',
      capacity: undefined,
      latitude: '',
      longitude: '',
    },
  });

  // Fetch cities when modal opens
  useEffect(() => {
    const fetchCities = async () => {
      if (isOpen) {
        try {
          setIsLoadingCities(true);
          const response = await getCities();
          if (response.success && response.data) {
            setCities(response.data);
          }
        } catch (error) {
          console.error('Error fetching cities:', error);
          toast.error('Failed to load cities');
        } finally {
          setIsLoadingCities(false);
        }
      }
    };

    fetchCities();
  }, [isOpen]);

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude.toString());
        form.setValue('longitude', position.coords.longitude.toString());
        toast.success('Location captured successfully');
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get your location');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes
      }
    );
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await createVenue({
        ...values,
        latitude: values.latitude ?? '',
        longitude: values.longitude ?? '',
      });

      if (response.success && response.data) {
        toast.success('Venue created successfully');
        onVenueCreated(response.data);
        form.reset();
        onClose();
      } else {
        toast.error(response.message || 'Failed to create venue');
      }
    } catch (error) {
      console.error('Error creating venue:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Venue</DialogTitle>
          <DialogDescription>
            Add a new venue that you can use for your events.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of your venue or location.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingCities}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}, {city.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the city where your venue is located.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the full address..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide the complete address of the venue.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseInt(value, 10)
                          );
                        }}
                        value={field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of people the venue can accommodate.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Info (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone or email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Contact information for the venue.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the venue, amenities, parking, etc..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about the venue, amenities, or special
                    features.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Coordinates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Location Coordinates (Optional)
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Get Current Location
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 6.5244" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3.3792" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Coordinates help with accurate location mapping and directions.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Venue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
