'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserEventsProps {
  events: any[];
}

export default function UserEvents({ events }: UserEventsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events Created</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <h4 className="font-medium">{event.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{formatDate(event.startDateTime)}</span>
                    {event.venue && <span>{event.venue.name}</span>}
                    <Badge
                      variant={
                        event.publishedStatus === 'PUBLISHED'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {event.publishedStatus}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency(
                      event.ticketTypes.reduce(
                        (total: number, ticketType: any) =>
                          total + ticketType.tickets.length * ticketType.price,
                        0
                      )
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {event.ticketTypes.reduce(
                      (total: number, ticketType: any) =>
                        total + ticketType.tickets.length,
                      0
                    )}{' '}
                    tickets sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No events created yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
