'use client';

import { Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserTicketsProps {
  tickets: any[];
}

export default function UserTickets({ tickets }: UserTicketsProps) {
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
        <CardTitle>Tickets Purchased</CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <h4 className="font-medium">
                    {ticket.ticketType.event.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Purchased on {formatDate(ticket.purchasedAt)}</span>
                    {ticket.ticketType.event.venue && (
                      <span>{ticket.ticketType.event.venue.name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency(ticket.ticketType.price)}
                  </p>
                  <Badge
                    variant={ticket.status === 'USED' ? 'secondary' : 'default'}
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tickets purchased yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
