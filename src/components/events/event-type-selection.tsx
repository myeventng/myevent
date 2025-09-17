'use client';

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Vote,
  Mail,
  Users,
  Trophy,
  DollarSign,
  Clock,
  Globe,
} from 'lucide-react';
import { EventType } from '@/generated/prisma';

const formSchema = z.object({
  eventType: z.nativeEnum(EventType),
});

type FormValues = z.infer<typeof formSchema>;

interface EventTypeSelectionProps {
  formData: any;
  updateFormData: (data: Partial<FormValues>) => void;
  onNext: () => void;
}

export function EventTypeSelection({
  formData,
  updateFormData,
  onNext,
}: EventTypeSelectionProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: formData.eventType || EventType.STANDARD,
    },
  });

  const eventTypes = [
    {
      type: EventType.STANDARD,
      title: 'Standard Event',
      description:
        'Regular events with tickets, venues, and traditional event management',
      icon: Calendar,
      features: [
        'Physical or virtual venues',
        'Ticket sales and management',
        'Attendee tracking',
        'Event scheduling',
        'Media galleries',
      ],
      comingSoon: false,
    },
    {
      type: EventType.VOTING_CONTEST,
      title: 'Voting Contest',
      description: 'Create competitions where users can vote for contestants',
      icon: Vote,
      features: [
        'Online voting platform',
        'Contestant management',
        'Free or paid voting',
        'Vote packages & pricing',
        'Real-time results',
        'Contest analytics',
      ],
      comingSoon: false,
    },
    {
      type: EventType.INVITE,
      title: 'Invite-Only Event',
      description: 'Private events with invitation-based attendance',
      icon: Mail,
      features: [
        'Invitation management',
        'RSVP tracking',
        'Guest list control',
        'Private event access',
        'Invitation customization',
      ],
      comingSoon: true,
    },
  ];

  const onSubmit = (values: FormValues) => {
    updateFormData(values);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Event Type</h2>
        <p className="text-muted-foreground">
          Choose the type of event you want to create. Each type has different
          features and workflows.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {eventTypes.map((eventType) => {
                      const Icon = eventType.icon;
                      const isSelected = field.value === eventType.type;
                      const isDisabled = eventType.comingSoon;

                      return (
                        <div key={eventType.type} className="relative">
                          <RadioGroupItem
                            value={eventType.type}
                            id={eventType.type}
                            className="sr-only"
                            disabled={isDisabled}
                          />
                          <label
                            htmlFor={eventType.type}
                            className={`block cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <Card
                              className={`transition-all duration-200 ${
                                isSelected
                                  ? 'ring-2 ring-primary border-primary bg-primary/5'
                                  : 'hover:shadow-md hover:border-primary/30'
                              } ${isDisabled ? 'pointer-events-none' : ''}`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-2 rounded-lg ${
                                        isSelected
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        {eventType.title}
                                        {eventType.comingSoon && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Coming Soon
                                          </Badge>
                                        )}
                                      </CardTitle>
                                    </div>
                                  </div>
                                  {isSelected && !isDisabled && (
                                    <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                                <CardDescription className="text-sm">
                                  {eventType.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Key Features:
                                  </p>
                                  <ul className="space-y-1">
                                    {eventType.features.map(
                                      (feature, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-muted-foreground flex items-center gap-2"
                                        >
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                                          {feature}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Information based on selected type */}
          {form.watch('eventType') === EventType.VOTING_CONTEST && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Vote className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">
                    Voting Contest Event
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You&apos;re creating a voting contest. This type of event is
                    conducted online and allows users to vote for contestants.
                    You can set up free voting, paid voting with vote packages,
                    or a combination of both.
                  </p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Globe className="h-4 w-4" />
                      <span>Online event (no physical venue required)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Users className="h-4 w-4" />
                      <span>Contestant management system</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <DollarSign className="h-4 w-4" />
                      <span>Flexible voting and pricing options</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Trophy className="h-4 w-4" />
                      <span>Real-time results and analytics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.watch('eventType') === EventType.INVITE && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">
                    Invite-Only Event
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    This feature is coming soon! Invite-only events will allow
                    you to create private events with invitation management and
                    RSVP tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.watch('eventType') === EventType.INVITE}
            >
              {form.watch('eventType') === EventType.INVITE
                ? 'Coming Soon'
                : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
