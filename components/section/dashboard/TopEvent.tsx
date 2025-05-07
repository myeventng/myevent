'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const topEvents = [
  {
    name: 'Summer Music Festival',
    category: 'Music',
    ticketsSold: 875,
    ticketsTotal: 1000,
    revenue: '43,750',
    percentageSold: 87.5,
  },
  {
    name: 'Tech Conference 2025',
    category: 'Business',
    ticketsSold: 423,
    ticketsTotal: 500,
    revenue: '105,750',
    percentageSold: 84.6,
  },
  {
    name: 'Food & Wine Festival',
    category: 'Food & Drink',
    ticketsSold: 652,
    ticketsTotal: 800,
    revenue: '32,600',
    percentageSold: 81.5,
  },
  {
    name: 'Art Exhibition',
    category: 'Arts',
    ticketsSold: 312,
    ticketsTotal: 400,
    revenue: '10,920',
    percentageSold: 78.0,
  },
  {
    name: 'Charity Gala',
    category: 'Charity',
    ticketsSold: 187,
    ticketsTotal: 250,
    revenue: '28,050',
    percentageSold: 74.8,
  },
];

export function TopEvents() {
  return (
    <div className="space-y-8">
      {topEvents.map((event, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <p className="font-medium">{event.name}</p>
                <Badge className="ml-2" variant="outline">
                  {event.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.ticketsSold} / {event.ticketsTotal} tickets sold · ₦
                {event.revenue}
              </p>
            </div>
            <div className="font-medium">{event.percentageSold}%</div>
          </div>
          <Progress value={event.percentageSold} className="h-2" />
        </div>
      ))}
    </div>
  );
}
