// app/payment/success/page.tsx 
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { CheckCircle, Mail, Download, Calendar, MapPin, Ticket, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SearchParams {
  orderId?: string;
  voteOrderId?: string;
  type?: string;
  guest?: string;
  email?: string;
}

export default async function PaymentSuccess({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Handle vote orders
  if (params.type === 'vote' && params.voteOrderId) {
    const voteOrder = await prisma.voteOrder.findUnique({
      where: { id: params.voteOrderId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!voteOrder) {
      return (
        <main className="mx-auto max-w-2xl py-44 px-4">
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find your order. Please contact support if you need
            assistance.
          </p>
          <Link className="underline" href="/events">
            Browse Events
          </Link>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-3xl py-20 px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Votes Purchased! 🎉</h1>
          <p className="text-muted-foreground">
            Your votes have been credited to your account
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contest:</span>
                <span className="font-medium">{voteOrder.contest.event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Votes Purchased:</span>
                <span className="font-semibold text-lg text-green-600">
                  {voteOrder.voteCount} votes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">
                  ₦{voteOrder.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Votes Remaining:</span>
                <span className="font-semibold text-purple-600">
                  {voteOrder.votesRemaining} votes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button asChild className="flex-1" size="lg">
            <Link href={`/events/${voteOrder.contest.event.slug}`}>
              Cast Your Votes Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  // Handle ticket orders (both guest and authenticated)
  const isGuest = params.guest === 'true';
  const guestEmail = params.email;

  const order = params.orderId
    ? await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        event: {
          include: {
            venue: {
              include: {
                city: true,
              },
            },
          },
        },
        buyer: true,
        tickets: {
          include: {
            ticketType: true,
          },
        },
      },
    })
    : null;

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl py-44 px-4">
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find your order. Please contact support if you need
          assistance.
        </p>
        <Link className="underline" href="/events">
          Browse Events
        </Link>
      </main>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'EEEE, MMMM d, yyyy • h:mm a');
  };

  return (
    <main className="mx-auto max-w-3xl py-20 px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Payment Successful! 🎉</h1>
        <p className="text-lg text-muted-foreground">
          Your tickets have been confirmed
        </p>
      </div>

      {/* Email Confirmation Alert */}
      <Alert className="border-green-200 bg-green-50 mb-6">
        <Mail className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800 ml-2">
          {isGuest ? (
            <>
              Your tickets have been sent to{' '}
              <strong className="font-semibold">{guestEmail}</strong>. Please
              check your inbox and spam folder.
            </>
          ) : (
            <>
              Your tickets have been sent to your registered email address.
              Please check your inbox and spam folder.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Order Summary Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Order Details */}
            <div>
              <h2 className="font-semibold text-lg mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono">{order.id.slice(-12)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tickets:</span>
                  <span className="font-medium">{order.quantity} ticket(s)</span>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="border-t pt-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{order.event.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDateTime(order.event.startDateTime)}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{order.event.venue.name}</p>
                    <p className="text-muted-foreground">
                      {order.event.venue.address}
                      {order.event.venue.city &&
                        `, ${order.event.venue.city.name}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Breakdown */}
            <div className="border-t pt-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Your Tickets
              </h2>
              <div className="space-y-2">
                {order.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{ticket.ticketType.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ticket.ticketId}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatCurrency(ticket.ticketType.price)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Important Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Your tickets have been sent to your email as PDF attachments</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Present your ticket (digital or printed) at the event entrance</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Arrive at least 30 minutes before the event starts</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Bring a valid ID if required by the event organizer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-4">
        {isGuest ? (
          // Guest user buttons
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1" size="lg">
              <Link href="/events">
                <Users className="mr-2 h-4 w-4" />
                Browse More Events
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1" size="lg">
              <Link href="/auth/register">
                <ArrowRight className="mr-2 h-4 w-4" />
                Create an Account
              </Link>
            </Button>
          </div>
        ) : (
          // Authenticated user buttons
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1" size="lg">
              <Link href="/dashboard/tickets">
                <Download className="mr-2 h-4 w-4" />
                View My Tickets
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1" size="lg">
              <Link href="/events">
                <Users className="mr-2 h-4 w-4" />
                Browse More Events
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Guest Account Creation Message */}
      {isGuest && (
        <Alert className="mt-6">
          <AlertDescription className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="font-semibold">Create an account</strong> to
              easily manage all your tickets in one place and get personalized
              event recommendations!
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Support Information */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Need help? Contact us at{' '}
            <a
              href="mailto:support@eventhub.ng"
              className="text-primary hover:underline font-medium"
            >
              support@eventhub.ng
            </a>{' '}
            or call{' '}
            <a
              href="tel:+2341234567890"
              className="text-primary hover:underline font-medium"
            >
              +234 (0) 123 456 7890
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}