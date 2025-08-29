'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Search,
  Filter,
  Download,
  QrCode,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { getUserTickets } from '@/actions/ticket.actions';
import { createTicketNotification } from '@/actions/notification.actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface UserTicketsPageProps {
  userId?: string;
}

export function UserTicketsPage({ userId }: UserTicketsPageProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterAndSortTickets();
  }, [tickets, searchTerm, statusFilter, sortBy]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const response = await getUserTickets();
      if (response.success && response.data) {
        setTickets(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortTickets = () => {
    let filtered = tickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticketType.event.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          ticket.ticketType.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (ticket) => ticket.status.toLowerCase() === statusFilter
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.purchasedAt).getTime() -
            new Date(a.purchasedAt).getTime()
          );
        case 'event':
          return a.ticketType.event.title.localeCompare(
            b.ticketType.event.title
          );
        case 'status':
          return a.status.localeCompare(b.status);
        case 'price':
          return b.ticketType.price - a.ticketType.price;
        default:
          return 0;
      }
    });

    setFilteredTickets(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'unused':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'unused':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'used':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
      default:
        return <Ticket className="w-4 h-4 text-gray-600" />;
    }
  };

  const isEventPast = (eventDate: string) => {
    return new Date(eventDate) < new Date();
  };

  const canRefundTicket = (ticket: any) => {
    const eventDate = new Date(ticket.ticketType.event.startDateTime);
    const now = new Date();
    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return ticket.status === 'UNUSED' && hoursDiff > 24; // Can refund if event is more than 24 hours away
  };

  const handleRefundRequest = async (ticketId: string) => {
    try {
      // Here you would typically call a refund API
      // For now, we'll just create a notification
      await createTicketNotification(ticketId, 'REFUND_REQUESTED');
      toast.success('Refund request submitted successfully');

      // Update ticket status locally
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, status: 'REFUND_REQUESTED' }
            : ticket
        )
      );
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Failed to submit refund request');
    }
  };

  const downloadTicket = (ticket: any) => {
    // Generate a simple ticket download
    const ticketData = {
      ticketId: ticket.ticketId,
      eventTitle: ticket.ticketType.event.title,
      ticketType: ticket.ticketType.name,
      price: ticket.ticketType.price,
      eventDate: ticket.ticketType.event.startDateTime,
      venue: ticket.ticketType.event.venue?.name,
      status: ticket.status,
    };

    const dataStr = JSON.stringify(ticketData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `ticket-${ticket.ticketId}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Ticket downloaded successfully');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground">
            View and manage your event tickets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </Badge>
          <Button variant="outline" onClick={fetchTickets} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Purchase Date</SelectItem>
                <SelectItem value="event">Event Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No tickets found</p>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : "You haven't purchased any tickets yet"}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button asChild className="mt-4">
                    <Link href="/events">Browse Events</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Ticket Info */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          {ticket.ticketType.event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ticket.ticketType.name}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(ticket.ticketType.event.startDateTime)}
                          </div>
                          {ticket.ticketType.event.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {ticket.ticketType.event.venue.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">{ticket.status}</span>
                        </Badge>
                        {isEventPast(ticket.ticketType.event.startDateTime) && (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-600"
                          >
                            Past Event
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ticket ID
                        </p>
                        <p className="font-mono text-sm">{ticket.ticketId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="font-semibold">
                          {formatCurrency(ticket.ticketType.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Purchased
                        </p>
                        <p className="text-sm">
                          {new Date(ticket.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Event Status
                        </p>
                        <p className="text-sm">
                          {isEventPast(ticket.ticketType.event.startDateTime)
                            ? 'Completed'
                            : 'Upcoming'}
                        </p>
                      </div>
                    </div>

                    {/* Event Description */}
                    {ticket.ticketType.event.description && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Event Description
                        </p>
                        <p className="text-sm line-clamp-2">
                          {ticket.ticketType.event.description}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTicket(ticket)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>

                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/tickets/${ticket.id}`}>
                          <QrCode className="w-4 h-4 mr-1" />
                          QR Code
                        </Link>
                      </Button>

                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/events/${ticket.ticketType.event.slug || ticket.ticketType.event.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Event
                        </Link>
                      </Button>

                      {canRefundTicket(ticket) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleRefundRequest(ticket.id)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Request Refund
                        </Button>
                      )}

                      {ticket.status === 'UNUSED' &&
                        !isEventPast(ticket.ticketType.event.startDateTime) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <Calendar className="w-4 h-4 mr-1" />
                            Add to Calendar
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* QR Code Section */}
                  {/* <div className="lg:w-48 bg-gray-50 p-6 flex flex-col items-center justify-center border-l">
                    <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center mb-4">
                      <QrCode className="w-16 h-16 text-gray-400" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Scan this QR code at the event entrance
                    </p>
                    {ticket.status === 'USED' && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Already Scanned
                      </Badge>
                    )}
                  </div> */}
                </div>

                {/* Event Timeline for upcoming events */}
                {ticket.status === 'UNUSED' &&
                  !isEventPast(ticket.ticketType.event.startDateTime) && (
                    <div className="border-t bg-blue-50 p-4">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Event starts in{' '}
                          {Math.ceil(
                            (new Date(
                              ticket.ticketType.event.startDateTime
                            ).getTime() -
                              new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Make sure to arrive 30 minutes early for check-in
                      </p>
                    </div>
                  )}

                {/* Refund Status */}
                {ticket.status === 'REFUND_REQUESTED' && (
                  <div className="border-t bg-orange-50 p-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Refund request submitted
                      </span>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      Your refund request is being processed. You&apos;ll be
                      notified once it&apos;s approved.
                    </p>
                  </div>
                )}

                {/* Past Event Notice */}
                {isEventPast(ticket.ticketType.event.startDateTime) &&
                  ticket.status === 'UNUSED' && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          This event has ended
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        This ticket was not used and the event has concluded.
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {tickets.filter((t) => t.status === 'UNUSED').length}
                </p>
                <p className="text-sm text-muted-foreground">Unused Tickets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {tickets.filter((t) => t.status === 'USED').length}
                </p>
                <p className="text-sm text-muted-foreground">Used Tickets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    tickets.reduce(
                      (sum, ticket) => sum + ticket.ticketType.price,
                      0
                    )
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {
                    tickets.filter(
                      (t) => !isEventPast(t.ticketType.event.startDateTime)
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
