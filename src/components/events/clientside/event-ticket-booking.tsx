'use client';

import { useState } from 'react';
import {
  Minus,
  Plus,
  Ticket,
  CreditCard,
  Users,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { initiateOrder } from '@/actions/order.actions';
import { useSession } from '@/lib/auth-client';
import { AuthModal } from '@/components/auth/auth-modal';

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  maxPerOrder?: number;
}

interface EventTicketBookingProps {
  event: {
    id: string;
    title: string;
    isFree: boolean;
    startDateTime: string;
    endDateTime?: string;
    slug: string;
    attendeeLimit?: number;
    venue?: {
      name: string;
      city?: {
        name: string;
      };
    };
  };
  ticketTypes: TicketType[];
  currentAttendees?: number;
}

export function EventTicketBooking({
  event,
  ticketTypes,
  currentAttendees = 0,
}: EventTicketBookingProps) {
  const [selectedTickets, setSelectedTickets] = useState<{
    [key: string]: number;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: session, refetch } = useSession();
  console.log('Current session:', session);

  const updateTicketQuantity = (ticketTypeId: string, change: number) => {
    setSelectedTickets((prev) => {
      const currentQty = prev[ticketTypeId] || 0;
      const newQty = Math.max(0, currentQty + change);
      const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);

      if (!ticketType) return prev;

      // Check availability
      if (newQty > ticketType.quantity) {
        toast.error(
          `Only ${ticketType.quantity} tickets available for ${ticketType.name}`
        );
        return prev;
      }

      // Check max per order limit
      if (ticketType.maxPerOrder && newQty > ticketType.maxPerOrder) {
        toast.error(
          `Maximum ${ticketType.maxPerOrder} tickets allowed per order for ${ticketType.name}`
        );
        return prev;
      }

      // Check event capacity
      if (event.attendeeLimit) {
        const totalSelected = Object.values({
          ...prev,
          [ticketTypeId]: newQty,
        }).reduce((sum, qty) => sum + qty, 0);

        if (currentAttendees + totalSelected > event.attendeeLimit) {
          toast.error('Event capacity exceeded');
          return prev;
        }
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

  const getTicketSelections = () => {
    return Object.entries(selectedTickets).map(([ticketTypeId, quantity]) => ({
      ticketTypeId,
      quantity,
    }));
  };

  const handleBookTickets = async () => {
    // Check if user is authenticated first
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    if (getTotalQuantity() === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await initiateOrder({
        eventId: event.id,
        ticketSelections: getTicketSelections(),
        purchaseNotes: purchaseNotes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message || 'Failed to create order');
        return;
      }

      // For free events, show success message
      if (event.isFree || getTotalPrice() === 0) {
        toast.success('Free tickets booked successfully!');
        // Redirect to tickets page or show confirmation
        window.location.href = '/dashboard/tickets';
        return;
      }

      // For paid events, redirect to Paystack payment page
      if (result.data?.paymentUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.data.paymentUrl;
      } else {
        toast.error('Payment URL not received');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handleAuthSuccess
  const handleAuthSuccess = async () => {
    // Refetch session after successful auth
    await refetch();

    // Get the current session data from the hook
    if (session?.user) {
      toast.success('Welcome! You can now proceed with your booking.');
      setTimeout(() => {
        handleBookTickets();
      }, 100);
    } else {
      // Fallback: wait a bit more and try again
      setTimeout(async () => {
        await refetch();
        // Use a small delay to let the session state update
        setTimeout(() => {
          if (session?.user) {
            toast.success('Welcome! You can now proceed with your booking.');
            setTimeout(() => {
              handleBookTickets();
            }, 100);
          } else {
            toast.error(
              'Authentication completed, but session is not available. Please refresh the page.'
            );
          }
        }, 200);
      }, 500);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventDate = new Date(event.startDateTime);
  const isEventSoon = eventDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isEventPast = eventDate.getTime() < Date.now();
  const hasAvailableTickets = ticketTypes.some((tt) => tt.quantity > 0);
  const isEventFull =
    event.attendeeLimit && currentAttendees >= event.attendeeLimit;

  // Don't show booking if event is past
  if (isEventPast) {
    return (
      <Card className="sticky top-6">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>This event has already ended.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show sold out message if no tickets available
  if (!hasAvailableTickets || isEventFull) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Event Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isEventFull
                ? 'This event has reached its capacity limit.'
                : 'All tickets for this event are sold out.'}
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Implement waiting list functionality
              toast.info('Waiting list feature coming soon!');
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Join Waiting List
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {event.isFree ? 'Get Free Tickets' : 'Book Tickets'}
          </CardTitle>

          {/* Event Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatDateTime(event.startDateTime)}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  {event.venue.name}
                  {event.venue.city && `, ${event.venue.city.name}`}
                </span>
              </div>
            )}
            {event.attendeeLimit && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentAttendees}/{event.attendeeLimit} attending
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Alert for events happening soon */}
          {isEventSoon && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                ⚡ Event starts soon! Book now to secure your spot.
              </AlertDescription>
            </Alert>
          )}

          {/* Security Notice for Paid Events */}
          {!event.isFree && (
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Secure payment powered by Paystack. Your payment information is
                protected.
              </AlertDescription>
            </Alert>
          )}

          {/* Auth Notice for Non-logged in Users */}
          {!session?.user && getTotalQuantity() > 0 && (
            <Alert className="border-purple-200 bg-purple-50">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                You'll need to sign in or create an account to complete your
                booking.
              </AlertDescription>
            </Alert>
          )}

          {/* Ticket Types */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Tickets</Label>
            {ticketTypes.map((ticketType) => (
              <div
                key={ticketType.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{ticketType.name}</h4>
                    {ticketType.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticketType.description}
                      </p>
                    )}
                    <p className="text-lg font-semibold text-primary mt-2">
                      {event.isFree ? 'Free' : formatPrice(ticketType.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        ticketType.quantity > 10 ? 'secondary' : 'destructive'
                      }
                    >
                      {ticketType.quantity} left
                    </Badge>
                    {ticketType.maxPerOrder && (
                      <Badge variant="outline" className="text-xs">
                        Max {ticketType.maxPerOrder} per order
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, -1)}
                      disabled={!selectedTickets[ticketType.id] || isProcessing}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium text-lg">
                      {selectedTickets[ticketType.id] || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(ticketType.id, 1)}
                      disabled={
                        ticketType.quantity === 0 ||
                        (selectedTickets[ticketType.id] || 0) >=
                          ticketType.quantity ||
                        (ticketType.maxPerOrder &&
                          (selectedTickets[ticketType.id] || 0) >=
                            ticketType.maxPerOrder) ||
                        isProcessing
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedTickets[ticketType.id] && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Subtotal
                      </div>
                      <div className="font-medium">
                        {event.isFree
                          ? 'Free'
                          : formatPrice(
                              ticketType.price * selectedTickets[ticketType.id]
                            )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Purchase Notes */}
          {getTotalQuantity() > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="text-sm"
              >
                {showNotes ? 'Hide' : 'Add'} Special Requests
              </Button>

              {showNotes && (
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">
                    Special requests or notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special dietary requirements, accessibility needs, or other requests..."
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {purchaseNotes.length}/500 characters
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          {getTotalQuantity() > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2">
                  {Object.entries(selectedTickets).map(
                    ([ticketTypeId, quantity]) => {
                      const ticketType = ticketTypes.find(
                        (t) => t.id === ticketTypeId
                      );
                      if (!ticketType) return null;

                      return (
                        <div
                          key={ticketTypeId}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {ticketType.name} × {quantity}
                          </span>
                          <span>
                            {event.isFree
                              ? 'Free'
                              : formatPrice(ticketType.price * quantity)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Total ({getTotalQuantity()} ticket
                    {getTotalQuantity() !== 1 ? 's' : ''})
                  </span>
                  <span className="text-lg font-bold text-primary">
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
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : !session?.user ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Sign in to{' '}
                {event.isFree
                  ? 'Get Tickets'
                  : 'Pay ' + formatPrice(getTotalPrice())}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {event.isFree ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Get Free Tickets
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPrice(getTotalPrice())}
                  </>
                )}
              </div>
            )}
          </Button>

          {/* Additional Information */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• Tickets are non-refundable unless event is cancelled</p>
            <p>• Valid ID may be required at entry</p>
            <p>• E-tickets will be sent to your email after payment</p>
            {!event.isFree && (
              <>
                <p>• Secure payment processing by Paystack</p>
                <p>• All major cards and bank transfers accepted</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        eventTitle={event.title}
        defaultTab="login"
      />
    </>
  );
}
