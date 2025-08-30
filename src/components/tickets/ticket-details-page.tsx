//
'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Ticket as TicketIcon,
  Download,
  Share2,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  // CardDescription,
  // CardFooter,
  // CardHeader,
  // CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTicketById } from '@/actions/ticket.actions';
import { toast } from 'sonner';
import { TicketStatus } from '@/generated/prisma';
import { Separator } from '@/components/ui/separator';

interface TicketDetailsPageProps {
  params: {
    id: string;
  };
}

export function TicketDetailsPage({ params }: TicketDetailsPageProps) {
  const { id } = params;
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setIsLoading(true);
        const response = await getTicketById(id);

        if (response.success && response.data) {
          setTicket(response.data);
        } else {
          toast.error(response.message || 'Failed to load ticket');
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast.error('An error occurred while loading ticket');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  // Get status badge variant based on ticket status
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'USED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Used
          </Badge>
        );
      case 'UNUSED':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Unused
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Refunded
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const shareTicket = async () => {
    if (!ticket) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `My ticket for ${ticket.ticketType.event.title}`,
          text: `Check out my ticket for ${
            ticket.ticketType.event.title
          } on ${formatDateTime(ticket.ticketType.event.startDateTime)}`,
          url: window.location.href,
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        navigator.clipboard.writeText(window.location.href);
        toast.success('Ticket link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      toast.error('Failed to share ticket');
    }
  };

  // Download ticket as PDF
  const downloadTicket = async () => {
    if (!ticket || !ticketRef.current) return;

    try {
      setIsGeneratingPdf(true);
      // Here you would typically implement PDF generation using a library like jsPDF or html2canvas
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        toast.success('Ticket downloaded successfully');
        setIsGeneratingPdf(false);
      }, 2000);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error('Failed to download ticket');
      setIsGeneratingPdf(false);
    }
  };

  // Render content based on loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 py-12">
        <TicketIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Ticket Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The ticket you&apos;re looking for could not be found.
        </p>
        <Button asChild>
          <Link href="/dashboard/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Tickets
          </Link>
        </Button>
      </div>
    );
  }

  const event = ticket.ticketType.event;
  const venue = event.venue;

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" size="sm" asChild className="mr-auto">
          <Link href="/dashboard/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Tickets
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={shareTicket}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTicket}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download
              </>
            )}
          </Button>
        </div>
      </div>

      <div ref={ticketRef}>
        <Card className="overflow-hidden">
          <div className="relative h-48">
            <Image
              src={event.coverImageUrl || '/images/placeholder-event.jpg'}
              alt={event.title}
              layout="fill"
              objectFit="cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              <p className="text-white/80">{ticket.ticketType.name}</p>
            </div>
            <div className="absolute top-4 right-4">
              {getStatusBadge(ticket.status)}
            </div>
          </div>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Event Details</h2>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Calendar className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(event.startDateTime)}
                      </p>
                      <p className="text-muted-foreground">
                        to {formatDateTime(event.endDateTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-muted-foreground">{venue.address}</p>
                      <p className="text-muted-foreground">
                        {venue.city?.name}, {venue.city?.state}
                      </p>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">Additional Location Info</p>
                        <p className="text-muted-foreground">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-lg font-semibold mb-2">
                  Ticket Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket ID</p>
                    <p className="font-medium">{ticket.ticketId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Type</p>
                    <p className="font-medium">{ticket.ticketType.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">
                      {event.isFree
                        ? 'Free'
                        : new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                          }).format(ticket.ticketType.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchased</p>
                    <p className="font-medium">
                      {format(new Date(ticket.purchasedAt), 'PP')}
                    </p>
                  </div>
                </div>
              </div>

              {event.idRequired && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800">ID Required</p>
                      <p className="text-amber-700 text-sm">
                        Please bring a valid photo ID to this event.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <h2 className="text-lg font-semibold mb-4">
                Scan QR Code for Entry
              </h2>
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeSVG
                  value={`ticket:${ticket.id}:${ticket.ticketId}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="mt-4 text-center text-muted-foreground">
                Present this QR code at the venue for entry.
              </p>
              {ticket.status === 'USED' && (
                <Badge
                  variant="outline"
                  className="mt-4 bg-green-100 text-green-800"
                >
                  This ticket has been used
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
