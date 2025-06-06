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

  // Handle date and time changes
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      const currentStart = form.getValues('startDateTime');
      const newStart = new Date(date);
      // Preserve the time from current start
      newStart.setHours(currentStart.getHours(), currentStart.getMinutes());
      form.setValue('startDateTime', newStart, { shouldValidate: true });

      // If end date is before the new start date, update it
      const endDate = form.getValues('endDateTime');
      if (endDate < newStart) {
        const newEnd = addHours(newStart, 3);
        form.setValue('endDateTime', newEnd, { shouldValidate: true });
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      const currentEnd = form.getValues('endDateTime');
      const newEnd = new Date(date);
      // Preserve the time from current end
      newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes());
      form.setValue('endDateTime', newEnd, { shouldValidate: true });
    }
  };

  const handleLateEntryDateChange = (date: Date | undefined) => {
    if (date) {
      const currentLateEntry = form.getValues('lateEntry');
      const newLateEntry = new Date(date);
      if (currentLateEntry) {
        // Preserve the time from current late entry
        newLateEntry.setHours(
          currentLateEntry.getHours(),
          currentLateEntry.getMinutes()
        );
      } else {
        // Use start time as default
        const startTime = form.getValues('startDateTime');
        newLateEntry.setHours(startTime.getHours(), startTime.getMinutes());
      }
      form.setValue('lateEntry', newLateEntry, { shouldValidate: true });
    } else {
      form.setValue('lateEntry', undefined, { shouldValidate: true });
    }
  };

  const handleStartTimeChange = (time: string) => {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const currentStart = form.getValues('startDateTime');
      const newStart = new Date(currentStart);
      newStart.setHours(hours, minutes);
      form.setValue('startDateTime', newStart, { shouldValidate: true });

      // If end date is before the new start date, update it
      const endDate = form.getValues('endDateTime');
      if (endDate < newStart) {
        const newEnd = addHours(newStart, 3);
        form.setValue('endDateTime', newEnd, { shouldValidate: true });
      }
    }
  };

  const handleEndTimeChange = (time: string) => {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const currentEnd = form.getValues('endDateTime');
      const newEnd = new Date(currentEnd);
      newEnd.setHours(hours, minutes);
      form.setValue('endDateTime', newEnd, { shouldValidate: true });
    }
  };

  const handleLateEntryTimeChange = (time: string) => {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const currentLateEntry = form.getValues('lateEntry');
      if (currentLateEntry) {
        const newLateEntry = new Date(currentLateEntry);
        newLateEntry.setHours(hours, minutes);
        form.setValue('lateEntry', newLateEntry, { shouldValidate: true });
      }
    }
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
            {/* Start Date and Time */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      date={field.value}
                      onSelect={handleStartDateChange}
                    />
                    <FormDescription>
                      The date when your event starts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel htmlFor="startTime">Start Time</FormLabel>
                <Input
                  id="startTime"
                  type="time"
                  value={format(form.getValues('startDateTime'), 'HH:mm')}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
                <FormDescription>
                  The time when your event starts.
                </FormDescription>
              </div>
            </div>

            {/* End Date and Time */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      date={field.value}
                      onSelect={handleEndDateChange}
                    />
                    <FormDescription>
                      The date when your event ends.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel htmlFor="endTime">End Time</FormLabel>
                <Input
                  id="endTime"
                  type="time"
                  value={format(form.getValues('endDateTime'), 'HH:mm')}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                />
                <FormDescription>
                  The time when your event ends.
                </FormDescription>
              </div>
            </div>
          </div>

          {/* Late Entry (Optional) */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="lateEntry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late Entry Date (Optional)</FormLabel>
                  <DatePicker
                    date={field.value}
                    onSelect={handleLateEntryDateChange}
                    placeholder="Select latest entry date"
                  />
                  <FormDescription>
                    The latest date attendees can enter the event. Leave empty
                    if there&apos;s no late entry restriction.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.getValues('lateEntry') && (
              <div>
                <FormLabel htmlFor="lateEntryTime">Late Entry Time</FormLabel>
                <Input
                  id="lateEntryTime"
                  type="time"
                  value={
                    form.getValues('lateEntry')
                      ? format(form.getValues('lateEntry')!, 'HH:mm')
                      : ''
                  }
                  onChange={(e) => handleLateEntryTimeChange(e.target.value)}
                />
                <FormDescription>
                  The latest time attendees can enter the event.
                </FormDescription>
              </div>
            )}
          </div>

          {/* Event Duration Display */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">Event Summary</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Start:</strong>{' '}
                {format(form.getValues('startDateTime'), 'PPP p')}
              </p>
              <p>
                <strong>End:</strong>{' '}
                {format(form.getValues('endDateTime'), 'PPP p')}
              </p>
              {form.getValues('lateEntry') && (
                <p>
                  <strong>Late Entry Until:</strong>{' '}
                  {format(form.getValues('lateEntry')!, 'PPP p')}
                </p>
              )}
              <p>
                <strong>Duration:</strong>{' '}
                {Math.round(
                  (form.getValues('endDateTime').getTime() -
                    form.getValues('startDateTime').getTime()) /
                    (1000 * 60 * 60 * 100)
                ) / 100}{' '}
                hours
              </p>
            </div>
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
