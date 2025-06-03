'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Ticket,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getUserTickets } from '@/actions/ticket.actions';
import { toast } from 'sonner';
import { TicketStatus } from '@/generated/prisma';

export function UserTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const response = await getUserTickets();

        if (response.success && response.data) {
          setTickets(response.data);
        } else {
          toast.error(response.message || 'Failed to load tickets');
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('An error occurred while loading tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Filter tickets by status and date
  const getUpcomingTickets = () => {
    return tickets.filter((ticket) => {
      const eventDate = new Date(ticket.ticketType.event.startDateTime);
      return (
        eventDate > new Date() &&
        (ticket.status === 'UNUSED' || ticket.status === 'USED')
      );
    });
  };

  const getPastTickets = () => {
    return tickets.filter((ticket) => {
      const eventDate = new Date(ticket.ticketType.event.startDateTime);
      return eventDate < new Date();
    });
  };

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

  // Render content based on loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <p className="text-muted-foreground">
          View and manage your event tickets.
        </p>
      </div>

      <Tabs defaultValue="upcoming" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {getUpcomingTickets().length === 0 ? (
            <div className="py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No upcoming tickets</h3>
              <p className="text-muted-foreground mt-1">
                You don&apos;t have any tickets for upcoming events.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getUpcomingTickets().map((ticket) => (
                <Card key={ticket.id} className="overflow-hidden">
                  <div className="relative h-40">
                    <Image
                      src={
                        ticket.ticketType.event.coverImageUrl ||
                        '/images/placeholder-event.jpg'
                      }
                      alt={ticket.ticketType.event.title}
                      layout="fill"
                      objectFit="cover"
                    />
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1">
                      {ticket.ticketType.event.title}
                    </CardTitle>
                    <CardDescription>
                      {ticket.ticketType.name} - Ticket #{ticket.ticketId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm">
                        {formatDateTime(ticket.ticketType.event.startDateTime)}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm">
                        {ticket.ticketType.event.venue.name},{' '}
                        {ticket.ticketType.event.venue.city?.name}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/dashboard/tickets/${ticket.id}`}>
                        View Ticket <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {getPastTickets().length === 0 ? (
            <div className="py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No past tickets</h3>
              <p className="text-muted-foreground mt-1">
                You haven&apos;t attended any events yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getPastTickets().map((ticket) => (
                <Card key={ticket.id} className="overflow-hidden">
                  <div className="relative h-40">
                    <Image
                      src={
                        ticket.ticketType.event.coverImageUrl ||
                        '/images/placeholder-event.jpg'
                      }
                      alt={ticket.ticketType.event.title}
                      layout="fill"
                      objectFit="cover"
                      className="opacity-70"
                    />
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1">
                      {ticket.ticketType.event.title}
                    </CardTitle>
                    <CardDescription>
                      {ticket.ticketType.name} - Ticket #{ticket.ticketId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm">
                        {formatDateTime(ticket.ticketType.event.startDateTime)}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm">
                        {ticket.ticketType.event.venue.name},{' '}
                        {ticket.ticketType.event.venue.city?.name}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/dashboard/tickets/${ticket.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
