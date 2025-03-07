'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CityFormValues,
  createCity,
  updateCity,
} from '@/lib/actions/city.actions';
import { CitySchema } from '@/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { nigerianStates } from '@/constants';

interface CityFormProps {
  initialData?: {
    id: string;
    name: string;
    state: string;
    population?: number;
  } | null;
}

export const CityForm = ({ initialData }: CityFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<CityFormValues>({
    resolver: zodResolver(CitySchema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? '', // Ensure controlled value
          state: initialData.state ?? '',
          population: initialData.population ?? 0, // Default to 0
        }
      : {
          name: '',
          state: '',
          population: 0, // Avoid uncontrolled state
        },
  });

  const onSubmit = async (data: CityFormValues) => {
    setLoading(true);

    try {
      if (initialData) {
        // Update existing city
        const result = await updateCity(initialData.id, data);

        if ('error' in result) {
          toast.error(result.error);
        } else {
          toast.success('City updated successfully');
          router.push('/admin/cities');
          router.refresh();
        }
      } else {
        // Create new city
        const result = await createCity(data);

        if ('error' in result) {
          toast.error(result.error);
        } else {
          toast.success('City created successfully');
          router.push('/admin/cities');
          router.refresh();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
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
                disabled={loading}
                onValueChange={(value) => field.onChange(value)}
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger key={field.value} className="text-black">
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
              <FormLabel>Population (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={loading}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                Enter the estimated population of the city
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? 'Processing...'
            : initialData
            ? 'Update City'
            : 'Create City'}
        </Button>
      </form>
    </Form>
  );
};
