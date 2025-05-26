'use client';

import { useState } from 'react';
import { Minus, Plus, Ticket, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface EventTicketBookingProps {
  event: {
    id: string;
    title: string;
    isFree: boolean;
    startDateTime: string;
  };
  ticketTypes: TicketType[];
}

export function EventTicketBooking({
  event,
  ticketTypes,
}: EventTicketBookingProps) {
  const [selectedTickets, setSelectedTickets] = useState<{
    [key: string]: number;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const updateTicketQuantity = (ticketTypeId: string, change: number) => {
    setSelectedTickets((prev) => {
      const currentQty = prev[ticketTypeId] || 0;
      const newQty = Math.max(0, currentQty + change);
      const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);

      if (ticketType && newQty > ticketType.quantity) {
        toast.error(
          `Only ${ticketType.quantity} tickets available for ${ticketType.name}`
        );
        return prev;
      }

      if (newQty === 0) {
        const { [ticketTypeId]: removed, ...rest } = prev;
        return rest;
      }

      return { ...prev, [ticketTypeId]: newQty };
    });
  };

  const getTotalQuantity = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce(
      (total, [ticketTypeId, qty]) => {
        const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
        return total + (ticketType ? ticketType.price * qty : 0);
      },
      0
    );
  };

  const handleBookTickets = async () => {
    if (getTotalQuantity() === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement ticket booking logic
      // This would typically involve:
      // 1. Creating an order
      // 2. Initiating payment (Paystack)
      // 3. Redirecting to payment page

      toast.success('Redirecting to payment...');

      // Mock implementation - replace with actual booking logic
      console.log('Booking tickets:', {
        eventId: event.id,
        tickets: selectedTickets,
        totalAmount: getTotalPrice(),
      });
    } catch (error) {
      toast.error('Failed to process booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const eventDate = new Date(event.startDateTime);
  const isEventSoon = eventDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          {event.isFree ? 'Get Free Tickets' : 'Book Tickets'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alert for events happening soon */}
        {isEventSoon && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              ⚡ Event starts soon! Book now to secure your spot.
            </p>
          </div>
        )}

        {/* Ticket Types */}
        <div className="space-y-3">
          {ticketTypes.map((ticketType) => (
            <div key={ticketType.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium">{ticketType.name}</h4>
                  <p className="text-lg font-semibold text-primary">
                    {event.isFree ? 'Free' : formatPrice(ticketType.price)}
                  </p>
                </div>
                <Badge variant="secondary">{ticketType.quantity} left</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTicketQuantity(ticketType.id, -1)}
                    disabled={!selectedTickets[ticketType.id]}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">
                    {selectedTickets[ticketType.id] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTicketQuantity(ticketType.id, 1)}
                    disabled={
                      ticketType.quantity === 0 ||
                      (selectedTickets[ticketType.id] || 0) >=
                        ticketType.quantity
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {selectedTickets[ticketType.id] && (
                  <div className="text-sm text-muted-foreground">
                    Subtotal:{' '}
                    {event.isFree
                      ? 'Free'
                      : formatPrice(
                          ticketType.price * selectedTickets[ticketType.id]
                        )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        {getTotalQuantity() > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Total Tickets:</span>
                <span>{getTotalQuantity()}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-primary">
                  {event.isFree ? 'Free' : formatPrice(getTotalPrice())}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Booking Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleBookTickets}
          disabled={getTotalQuantity() === 0 || isProcessing}
        >
          {isProcessing ? (
            'Processing...'
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              {event.isFree
                ? 'Get Free Tickets'
                : `Pay ${formatPrice(getTotalPrice())}`}
            </>
          )}
        </Button>

        {/* Additional Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Tickets are non-refundable</p>
          <p>• Valid ID may be required at entry</p>
          <p>• Tickets will be sent to your email</p>
        </div>
      </CardContent>
    </Card>
  );
}
