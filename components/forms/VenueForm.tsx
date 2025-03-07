'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import {
  VenueFormValues,
  createVenue,
  updateVenue,
  getAllCitiesForDropdown,
} from '@/lib/actions/venue.actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import 'leaflet/dist/leaflet.css';

// Define proper types
interface Location {
  latitude: number;
  longitude: number;
}

interface VenueFormProps {
  initialData?: {
    id: string;
    name: string;
    address: string;
    cityId: string;
    capacity?: number | null;
    description?: string | null;
    contactInfo?: string | null;
    location?: Location;
  } | null;
}

interface City {
  id: string;
  name: string;
  state: string;
}

// Fix the default marker icon issue
const defaultIcon = L.icon({
  iconUrl: '/red-pointer.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Define default map center
const DEFAULT_CENTER: [number, number] = [51.505, -0.09];

// Location Schema definition
export const LocationSchema = z.object({
  latitude: z.number().or(z.string().transform((val) => parseFloat(val))),
  longitude: z.number().or(z.string().transform((val) => parseFloat(val))),
});

// Schema for venue validation
export const VenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  address: z.string().min(1, 'Address is required'),
  cityId: z.string().min(1, 'City is required'),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .nonnegative('Capacity cannot be negative')
    .optional()
    .default(0),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  location: LocationSchema.optional(),
});

// Updated LocationPicker component to prevent infinite loops
function LocationPicker({
  onChange,
  initialLocation,
  manualCoordinates,
}: {
  onChange: (location: Location) => void;
  initialLocation?: Location;
  manualCoordinates: [number, number];
}) {
  // Use the initial location or default center as the starting position
  const [position, setPosition] = useState<[number, number]>(
    initialLocation
      ? [initialLocation.latitude, initialLocation.longitude]
      : DEFAULT_CENTER
  );

  // Use useCallback to prevent unnecessary re-renders and stabilize the function reference
  const handlePositionChange = useCallback(
    (newPosition: [number, number]) => {
      setPosition(newPosition);
      onChange({
        latitude: newPosition[0],
        longitude: newPosition[1],
      });
    },
    [onChange]
  );

  // Update position when manual coordinates change, but only if they've actually changed
  useEffect(() => {
    if (
      manualCoordinates &&
      !isNaN(manualCoordinates[0]) &&
      !isNaN(manualCoordinates[1]) &&
      (position[0] !== manualCoordinates[0] ||
        position[1] !== manualCoordinates[1])
    ) {
      setPosition(manualCoordinates);
    }
  }, [manualCoordinates, position]);

  // Update map view when position changes
  const MapUpdater = () => {
    const map = useMap();

    useEffect(() => {
      if (position && !isNaN(position[0]) && !isNaN(position[1])) {
        map.setView(position, 13);
      }
    }, [map, position]);

    return null;
  };

  // Handle map click events
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        // Parse coordinates as numbers
        const newPosition: [number, number] = [
          typeof lat === 'number' ? lat : parseFloat(lat.toString()),
          typeof lng === 'number' ? lng : parseFloat(lng.toString()),
        ];

        // Only update if coordinates have changed
        if (position[0] !== newPosition[0] || position[1] !== newPosition[1]) {
          handlePositionChange(newPosition);
        }
      },
    });

    return null;
  };

  return (
    <>
      <Marker position={position} icon={defaultIcon} />
      <MapClickHandler />
      <MapUpdater />
    </>
  );
}

export const VenueForm = ({ initialData }: VenueFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize coordinates with proper types
  const initialCoordinates: [number, number] = initialData?.location
    ? [
        Number(initialData.location.latitude),
        Number(initialData.location.longitude),
      ]
    : DEFAULT_CENTER;

  const [manualCoordinates, setManualCoordinates] =
    useState<[number, number]>(initialCoordinates);

  // Handle client-side rendering for Leaflet
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch cities for dropdown
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesData = await getAllCitiesForDropdown();
        setCities(citiesData);
      } catch (error) {
        toast.error('Failed to load cities');
      }
    };

    fetchCities();
  }, []);

  // Parse initial capacity value safely
  const parseCapacity = (value: number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    return typeof value === 'number' ? value : 0;
  };

  // Initialize form with proper type handling
  const form = useForm<VenueFormValues>({
    resolver: zodResolver(VenueSchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      cityId: initialData?.cityId || '',
      capacity: parseCapacity(initialData?.capacity),
      description: initialData?.description || '',
      contactInfo: initialData?.contactInfo || '',
      location: initialData?.location
        ? {
            latitude: Number(initialData.location.latitude),
            longitude: Number(initialData.location.longitude),
          }
        : {
            latitude: DEFAULT_CENTER[0],
            longitude: DEFAULT_CENTER[1],
          },
    },
  });

  const onSubmit = async (data: VenueFormValues) => {
    setLoading(true);

    try {
      console.log('Submitting data:', data); // Log the data before sending

      const submissionData = {
        ...data,
        location: data.location
          ? {
              latitude: Number(data.location.latitude),
              longitude: Number(data.location.longitude),
            }
          : undefined,
      };

      console.log('Formatted submissionData:', submissionData);

      let result;
      if (initialData) {
        result = await updateVenue(initialData.id, submissionData);
      } else {
        result = await createVenue(submissionData);
      }

      console.log('API Response:', result);

      if (result && 'error' in result) {
        toast.error(result.error);
        console.error('API Error:', result.error);
      } else {
        toast.success(
          initialData
            ? 'Venue updated successfully'
            : 'Venue created successfully'
        );
        router.push('/admin/venues');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error in onSubmit:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // const onSubmit = async (data: VenueFormValues) => {
  //   setLoading(true);

  //   try {
  //     // Ensure location data is properly formatted
  //     const submissionData = {
  //       ...data,
  //       location: data.location
  //         ? {
  //             latitude: Number(data.location.latitude),
  //             longitude: Number(data.location.longitude),
  //             placeName: data.location.placeName || '',
  //           }
  //         : undefined,
  //     };

  //     if (initialData) {
  //       // Update existing venue
  //       const result = await updateVenue(initialData.id, submissionData);

  //       if (result && 'error' in result) {
  //         toast.error(result.error);
  //       } else {
  //         toast.success('Venue updated successfully');
  //         router.push('/admin/venues');
  //         router.refresh();
  //       }
  //     } else {
  //       // Create new venue
  //       const result = await createVenue(submissionData);

  //       if (result && 'error' in result) {
  //         toast.error(result.error);
  //       } else {
  //         toast.success('Venue created successfully');
  //         router.push('/admin/venues');
  //         router.refresh();
  //       }
  //     }
  //   } catch (error: any) {
  //     toast.error(error.message || 'Something went wrong');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Handle location change with proper typing
  const handleLocationChange = useCallback(
    (location: Location) => {
      // Use optional chaining to avoid null/undefined errors

      form.setValue('location', {
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Update manual input fields when map is clicked
      setManualCoordinates([location.latitude, location.longitude]);
    },
    [form]
  );

  // Handle manual coordinate input changes
  const handleManualLatitudeChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat)) {
      const lng = manualCoordinates[1];
      setManualCoordinates([lat, lng]);
    }
  };

  const handleManualLongitudeChange = (value: string) => {
    const lng = parseFloat(value);
    if (!isNaN(lng)) {
      const lat = manualCoordinates[0];
      setManualCoordinates([lat, lng]);
    }
  };

  // Google Maps URL for coordinate lookup
  const googleMapsUrl = 'https://www.google.com/maps';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
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
                disabled={loading}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="text-black">
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

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={loading}
                  onChange={(e) => {
                    const value = e.target.value
                      ? parseInt(e.target.value, 10)
                      : 0;
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Maximum number of people the venue can accommodate
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={loading}
                  placeholder="Describe the venue facilities and features"
                  className="min-h-32"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Manual coordinate input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location.latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude (Required)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.000001"
                    disabled={loading}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value);
                      handleManualLatitudeChange(value);
                    }}
                    value={field.value !== undefined ? field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location.longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude (Required)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.000001"
                    disabled={loading}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value);
                      handleManualLongitudeChange(value);
                    }}
                    value={field.value !== undefined ? field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="text-sm">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Find coordinates on Google Maps
          </a>
          <p className="mt-1 text-gray-500">
            Right-click on any location in Google Maps and select "What's here?"
            to get coordinates
          </p>
        </div>

        {/* Location Picker - only render on client side */}
        {isMounted && (
          <FormItem>
            <FormLabel>Venue Location</FormLabel>
            <FormDescription>
              Click on the map to set the location or use the coordinate fields
              above
            </FormDescription>
            <div className="h-96 w-full">
              <MapContainer
                center={initialCoordinates}
                zoom={13}
                scrollWheelZoom={false}
                className="h-full w-full rounded-md"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker
                  onChange={handleLocationChange}
                  initialLocation={initialData?.location}
                  manualCoordinates={manualCoordinates}
                />
              </MapContainer>
            </div>

            {form.watch('location') && (
              <div className="mt-2 text-sm text-gray-600">
                Selected Location:{' '}
                {Number(form.watch('location.latitude')).toFixed(6)},
                {Number(form.watch('location.longitude')).toFixed(6)}
              </div>
            )}
          </FormItem>
        )}

        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Information (Optional)</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormDescription>
                Phone number, email or website for the venue
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? 'Processing...'
            : initialData
            ? 'Update Venue'
            : 'Create Venue'}
        </Button>
      </form>
    </Form>
  );
};
