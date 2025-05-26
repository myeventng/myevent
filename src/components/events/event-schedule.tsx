'use client';

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
import { DatePicker } from '@/components/layout/date-picker';
import { Input } from '@/components/ui/input';
import { format, addHours, startOfDay, addDays } from 'date-fns';

// Form schema for this step
const formSchema = z
  .object({
    startDateTime: z.date({
      required_error: 'Start date and time is required',
    }),
    endDateTime: z.date({
      required_error: 'End date and time is required',
    }),
    lateEntry: z.date().optional(),
  })
  .refine(
    (data) => {
      return data.endDateTime > data.startDateTime;
    },
    {
      message: 'End date must be after start date',
      path: ['endDateTime'],
    }
  )
  .refine(
    (data) => {
      return !data.lateEntry || data.lateEntry >= data.startDateTime;
    },
    {
      message: 'Late entry time must be after or same as start time',
      path: ['lateEntry'],
    }
  )
  .refine(
    (data) => {
      return !data.lateEntry || data.lateEntry <= data.endDateTime;
    },
    {
      message: 'Late entry time must be before or same as end time',
      path: ['lateEntry'],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface EventScheduleProps {
  formData: any;
  updateFormData: (data: Partial<FormValues>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function EventSchedule({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: EventScheduleProps) {
  // Set default dates if not provided
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const defaultStart = startOfDay(addHours(tomorrow, 18)); // 6 PM tomorrow
  const defaultEnd = addHours(defaultStart, 3); // 3 hours later

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDateTime: formData.startDateTime || defaultStart,
      endDateTime: formData.endDateTime || defaultEnd,
      lateEntry: formData.lateEntry || undefined,
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    updateFormData(values);
    onNext();
  };

  // Form field render helpers
  const renderTimeInput = (
    name: 'startTime' | 'endTime' | 'lateEntryTime',
    label: string,
    dateValue: Date | undefined,
    onTimeChange: (date: Date | undefined) => void
  ) => {
    const timeString = dateValue ? format(dateValue, 'HH:mm') : '';

    return (
      <div>
        <FormLabel htmlFor={name}>{label}</FormLabel>
        <Input
          id={name}
          type="time"
          value={timeString}
          onChange={(e) => {
            if (!dateValue || !e.target.value) return;

            const [hours, minutes] = e.target.value.split(':').map(Number);
            const newDate = new Date(dateValue);
            newDate.setHours(hours, minutes);
            onTimeChange(newDate);
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Schedule</h2>
        <p className="text-muted-foreground">
          Set the date and time for your event.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      date={field.value}
                      onSelect={(date) => {
                        if (date) {
                          // Keep the same time but change the date
                          const newDate = new Date(date);
                          newDate.setHours(
                            field.value.getHours(),
                            field.value.getMinutes()
                          );
                          field.onChange(newDate);

                          // If end date is before the new start date, update it
                          const endDate = form.getValues('endDateTime');
                          if (endDate < newDate) {
                            form.setValue('endDateTime', addHours(newDate, 3));
                          }
                        }
                      }}
                    />
                    <FormDescription>
                      The date when your event starts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderTimeInput(
                'startTime',
                'Start Time',
                form.getValues('startDateTime'),
                (date) => {
                  if (date) {
                    form.setValue('startDateTime', date, {
                      shouldValidate: true,
                    });

                    // If end date is before the new start date, update it
                    const endDate = form.getValues('endDateTime');
                    if (endDate < date) {
                      form.setValue('endDateTime', addHours(date, 3));
                    }
                  }
                }
              )}
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      date={field.value}
                      onSelect={(date) => {
                        if (date) {
                          // Keep the same time but change the date
                          const newDate = new Date(date);
                          newDate.setHours(
                            field.value.getHours(),
                            field.value.getMinutes()
                          );
                          field.onChange(newDate);
                        }
                      }}
                    />
                    <FormDescription>
                      The date when your event ends.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderTimeInput(
                'endTime',
                'End Time',
                form.getValues('endDateTime'),
                (date) => {
                  if (date) {
                    form.setValue('endDateTime', date, {
                      shouldValidate: true,
                    });
                  }
                }
              )}
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="lateEntry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late Entry Time (Optional)</FormLabel>
                  <DatePicker
                    date={field.value}
                    onSelect={(date) => field.onChange(date)}
                    placeholder="Select latest entry time"
                  />
                  <FormDescription>
                    The latest time attendees can enter the event. Leave empty
                    if there's no late entry restriction.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.getValues('lateEntry') &&
              renderTimeInput(
                'lateEntryTime',
                'Late Entry Time',
                form.getValues('lateEntry'),
                (date) => {
                  if (date) {
                    form.setValue('lateEntry', date, { shouldValidate: true });
                  }
                }
              )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
