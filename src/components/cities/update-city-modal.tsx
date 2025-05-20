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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { updateCity } from '@/actions/city-actions';
import { City } from '@/generated/prisma';
import { toast } from 'sonner';
import { nigerianStates } from '@/data';

// Form validation schema
const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'City name must be at least 2 characters'),
  state: z.string().min(2, 'State name must be at least 2 characters'),
  population: z.coerce
    .number()
    .optional()
    .refine((val) => val === undefined || !isNaN(val), {
      message: 'Invalid population value',
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: City;
  onCityUpdated: (city: City) => void;
}

export const UpdateCityModal = ({
  isOpen,
  onClose,
  city,
  onCityUpdated,
}: UpdateCityModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: city.id,
      name: city.name,
      state: city.state,
      population: city.population || 0,
    },
  });

  // Update form when city changes
  useEffect(() => {
    if (city) {
      form.reset({
        id: city.id,
        name: city.name,
        state: city.state,
        population: city.population || 0,
      });
    }
  }, [city, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await updateCity(values);

      if (response.success && response.data) {
        toast.success('City updated successfully');
        onCityUpdated(response.data);
        onClose();
      } else {
        toast.error(response.message || 'Failed to update city');
      }
    } catch (error) {
      console.error('Error updating city:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit City</DialogTitle>
          <DialogDescription>
            Update the details of {city.name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register('id')} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter city name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger
                        key={field.value}
                        className="text-black w-full"
                      >
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="text-black">
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
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
              name="population"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Population (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter population"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Update City
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
