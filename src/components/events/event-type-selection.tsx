"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Vote,
  Mail,
  Users,
  Trophy,
  DollarSign,
  Clock,
  Globe,
  Sparkles,
} from "lucide-react";
import { EventType } from "@/generated/prisma";

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
      title: "Standard Event",
      description:
        "Regular events with tickets, venues, and traditional event management",
      icon: Calendar,
      features: [
        "Physical or virtual venues",
        "Ticket sales and management",
        "Attendee tracking",
        "Event scheduling",
        "Media galleries",
      ],
      examples: [
        "Concerts & Music Festivals",
        "Conferences & Seminars",
        "Comedy Shows",
        "Theater Performances",
        "Sports Events",
        "Workshops & Training",
        "Trade Shows & Exhibitions",
        "Food & Wine Festivals",
      ],
      comingSoon: false,
    },
    {
      type: EventType.VOTING_CONTEST,
      title: "Voting Contest",
      description: "Create competitions where users can vote for contestants",
      icon: Vote,
      features: [
        "Online voting platform",
        "Contestant management",
        "Free or paid voting",
        "Vote packages & pricing",
        "Real-time results",
        "Contest analytics",
      ],
      examples: [
        "Beauty Pageants",
        "Talent Competitions",
        "Model Search Contests",
        "Brand Ambassador Selection",
        "Creative Arts Competitions",
        "Social Media Influencer Awards",
        "Community Choice Awards",
        "Student Leadership Elections",
      ],
      comingSoon: false,
    },
    {
      type: EventType.INVITE,
      title: "Invite-Only Event",
      description: "Private events with invitation-based attendance",
      icon: Mail,
      features: [
        "Invitation management",
        "RSVP tracking",
        "Guest list control",
        "Private event access",
        "Invitation customization",
      ],
      examples: [
        "Weddings & Engagements",
        "Birthday Parties",
        "Baby Showers",
        "Anniversary Celebrations",
        "Corporate Dinners",
        "Exclusive Product Launches",
        "VIP Networking Events",
        "Family Reunions",
      ],
      comingSoon: false,
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
                            className={`block cursor-pointer ${
                              isDisabled ? "cursor-not-allowed opacity-60" : ""
                            }`}
                          >
                            <Card
                              className={`transition-all duration-200 h-full ${
                                isSelected
                                  ? "ring-2 ring-primary border-primary bg-primary/5"
                                  : "hover:shadow-md hover:border-primary/30"
                              } ${isDisabled ? "pointer-events-none" : ""}`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`p-2 rounded-lg ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted"
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
                              <CardContent className="pt-0 space-y-4">
                                {/* Key Features */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Key Features:
                                  </p>
                                  <ul className="space-y-1">
                                    {eventType.features
                                      .slice(0, 3)
                                      .map((feature, index) => (
                                        <li
                                          key={index}
                                          className="text-sm text-muted-foreground flex items-center gap-2"
                                        >
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                                          {feature}
                                        </li>
                                      ))}
                                  </ul>
                                </div>

                                {/* Example Events */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Perfect For:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {eventType.examples
                                      .slice(0, 4)
                                      .map((example, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="text-xs font-normal"
                                        >
                                          {example}
                                        </Badge>
                                      ))}
                                  </div>
                                  {eventType.examples.length > 4 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      +{eventType.examples.length - 4} more
                                    </p>
                                  )}
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
          {form.watch("eventType") === EventType.VOTING_CONTEST && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Vote className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-blue-900">
                      Voting Contest Event
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      You&apos;re creating a voting contest. This type of event
                      is conducted online and allows users to vote for
                      contestants. You can set up free voting, paid voting with
                      vote packages, or a combination of both.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span>Online event (no physical venue required)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>Contestant management system</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span>Flexible voting and pricing options</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Trophy className="h-4 w-4 flex-shrink-0" />
                      <span>Real-time results and analytics</span>
                    </div>
                  </div>
                  <div className="bg-blue-100 border border-blue-300 rounded p-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Popular Examples:
                    </p>
                    <p className="text-sm text-blue-700">
                      Beauty pageants, talent shows, model search contests,
                      brand ambassador selections, and community choice awards
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.watch("eventType") === EventType.INVITE && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-purple-900">
                      Invite-Only Event
                    </h3>
                    <p className="text-sm text-purple-700 mt-1">
                      You&apos;re creating an invite-only event. This type of
                      event is private and guests will receive personalized
                      invitations via email with RSVP tracking.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span>Personalized email invitations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>RSVP and guest list management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>Plus-ones and special requirements</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span>Optional donation collection</span>
                    </div>
                  </div>
                  <div className="bg-purple-100 border border-purple-300 rounded p-3">
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      Popular Examples:
                    </p>
                    <p className="text-sm text-purple-700">
                      Weddings, birthday parties, baby showers, corporate
                      dinners, exclusive product launches, and family reunions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.watch("eventType") === EventType.STANDARD && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-green-900">
                      Standard Event
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      You&apos;re creating a standard event. Perfect for public
                      events with ticket sales, venue management, and attendee
                      tracking. Choose between free or paid events.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Physical or virtual venues</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span>Multiple ticket types & pricing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>Attendee capacity management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>Flexible scheduling options</span>
                    </div>
                  </div>
                  <div className="bg-green-100 border border-green-300 rounded p-3">
                    <p className="text-sm font-medium text-green-900 mb-1">
                      Popular Examples:
                    </p>
                    <p className="text-sm text-green-700">
                      Concerts, conferences, comedy shows, workshops, sports
                      events, food festivals, and trade shows
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                form.watch("eventType") === EventType.INVITE &&
                eventTypes.find((t) => t.type === EventType.INVITE)?.comingSoon
              }
            >
              {form.watch("eventType") === EventType.INVITE &&
              eventTypes.find((t) => t.type === EventType.INVITE)?.comingSoon
                ? "Coming Soon"
                : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
