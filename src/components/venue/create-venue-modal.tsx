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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { createVenue } from '@/actions/venue-actions';
import { City, Venue } from '@/generated/prisma';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { FileUploader } from '../layout/file-uploader';

// Import map components dynamically to avoid SSR issues
const MapPicker = dynamic(() => import('./map-picker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center bg-gray-100 rounded-md">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, 'Venue name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  cityId: z.string().min(1, 'City is required'),
  venueImageUrl: z.string().optional(),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  capacity: z.coerce
    .number()
    .optional()
    .refine((val) => val === undefined || !isNaN(val), {
      message: 'Invalid capacity value',
    }),
  latitude: z.string().min(1, 'Latitude is required'),
  longitude: z.string().min(1, 'Longitude is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVenueCreated: (venue: Venue) => void;
  cities: City[];
}

export const CreateVenueModal = ({
  isOpen,
  onClose,
  onVenueCreated,
  cities,
}: CreateVenueModalProps) => {
  const [venueImageFiles, setVenueImageFiles] = useState<File[]>([]);
  const [venueImage, setVenueImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
      cityId: '',
      description: '',
      venueImageUrl: '',
      contactInfo: '',
      capacity: 0,
      latitude: '',
      longitude: '',
    },
  });

  // Update form coordinates when map selection changes
  useEffect(() => {
    if (coords) {
      form.setValue('latitude', coords.lat.toString());
      form.setValue('longitude', coords.lng.toString());
    }
  }, [coords, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await createVenue({
        ...values,
        venueImageUrl: venueImage || undefined,
      });

      if (response.success && response.data) {
        toast.success('Venue created successfully');
        onVenueCreated(response.data);
        form.reset();
        setVenueImage('');
        setVenueImageFiles([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Venue</DialogTitle>
          <DialogDescription>
            Enter the details of the new venue you want to add.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                    <Input placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter capacity"
                          type="number"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Maximum number of people the venue can hold
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Information</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Phone, email, or website"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="venueImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Venue Image{' '}
                    <small className="text-muted-foreground">
                      (recommended aspect ratio 16:9)
                    </small>
                  </FormLabel>
                  <FormControl>
                    <FileUploader
                      onFieldChange={(url) => {
                        // Always treat as single URL for venue image
                        const singleUrl = Array.isArray(url) ? url[0] : url;
                        field.onChange(singleUrl);
                        setVenueImage(singleUrl);
                      }}
                      imageUrls={venueImage}
                      setFiles={setVenueImageFiles}
                      maxFiles={1}
                      endpoint="venueImage"
                      multipleImages={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the venue"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <FormLabel>Location</FormLabel>
                <div className="text-xs text-muted-foreground">
                  Click on the map to set the venue location
                </div>
              </div>

              <MapPicker
                onLocationSelected={(location) => setCoords(location)}
                defaultLocation={coords}
              />

              <div className="grid grid-cols-2 gap-4 mt-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Latitude" {...field} />
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
                      <FormControl>
                        <Input placeholder="Longitude" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
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
