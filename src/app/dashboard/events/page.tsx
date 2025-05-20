import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth, isOrganizer } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Copy,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Example event data
const events = [
  {
    id: '1',
    title: 'Tech Conference 2025',
    description: 'A conference for tech enthusiasts and professionals',
    startDateTime: '2025-05-20T10:00:00Z',
    endDateTime: '2025-05-20T18:00:00Z',
    location: 'Convention Center',
    coverImageUrl: null,
    publishedStatus: 'PUBLISHED',
    attendeeCount: 142,
    ticketSold: 183,
    revenue: 9150,
    isCancelled: false,
  },
  {
    id: '2',
    title: 'Music Festival',
    description:
      'Annual music festival featuring local and international artists',
    startDateTime: '2025-06-05T16:00:00Z',
    endDateTime: '2025-06-06T02:00:00Z',
    location: 'City Park',
    coverImageUrl: null,
    publishedStatus: 'PUBLISHED',
    attendeeCount: 0,
    ticketSold: 342,
    revenue: 17100,
    isCancelled: false,
  },
  {
    id: '3',
    title: 'Startup Networking Event',
    description: 'Connect with other entrepreneurs and investors',
    startDateTime: '2025-06-15T18:00:00Z',
    endDateTime: '2025-06-15T21:00:00Z',
    location: 'Innovation Hub',
    coverImageUrl: null,
    publishedStatus: 'PENDING_REVIEW',
    attendeeCount: 0,
    ticketSold: 0,
    revenue: 0,
    isCancelled: false,
  },
  {
    id: '4',
    title: 'Workshop: Introduction to AI',
    description: 'Learn the basics of artificial intelligence',
    startDateTime: '2025-07-10T14:00:00Z',
    endDateTime: '2025-07-10T17:00:00Z',
    location: 'Tech Campus',
    coverImageUrl: null,
    publishedStatus: 'DRAFT',
    attendeeCount: 0,
    ticketSold: 0,
    revenue: 0,
    isCancelled: false,
  },
];

// Event Card Component
function EventCard({ event }: { event: any }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Published
          </Badge>
        );
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'PENDING_REVIEW':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            Pending Review
          </Badge>
        );
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  const isUpcoming = new Date(event.startDateTime) > new Date();

  return (
    <div className="flex flex-col md:flex-row p-4 border rounded-md">
      <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-md mr-4 flex-shrink-0">
        <Calendar className="w-8 h-8 text-primary" />
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 md:items-center mt-3 md:mt-0">
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:gap-3">
            <h3 className="font-medium">{event.title}</h3>
            {getStatusBadge(event.publishedStatus)}
          </div>

          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            <span>{formatDate(event.startDateTime)}</span>
            <span>•</span>
            <span>
              {formatTime(event.startDateTime)} -{' '}
              {formatTime(event.endDateTime)}
            </span>
            <span>•</span>
            <span>{event.location}</span>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-4 mt-3 md:mt-0 text-sm">
          <div className="flex flex-col items-center">
            <span className="font-semibold">{event.ticketSold}</span>
            <span className="text-xs text-muted-foreground">Tickets</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-semibold">
              ${event.revenue.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
        </div>

        <div className="mt-4 md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link href={`/events/${event.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>View Event</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/dashboard/events/${event.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Event</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/dashboard/events/${event.id}/analytics`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>View Analytics</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {event.publishedStatus === 'DRAFT' && (
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
              )}

              {event.publishedStatus === 'DRAFT' && (
                <DropdownMenuItem className="text-blue-600">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Submit for Review</span>
                </DropdownMenuItem>
              )}

              {isUpcoming && event.publishedStatus === 'PUBLISHED' && (
                <DropdownMenuItem className="text-amber-600">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span>Cancel Event</span>
                </DropdownMenuItem>
              )}

              {event.publishedStatus === 'DRAFT' && (
                <DropdownMenuItem className="text-red-600">
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Delete Draft</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default async function OrganizerEventsPage() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });

  // Check if the user is an organizer, if not redirect
  if (!isOrganizer(session.user)) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Events</h1>
            <p className="text-muted-foreground">
              Manage your events and check performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/dashboard/create-event">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {events.filter((e) => e.publishedStatus === 'PUBLISHED').length}{' '}
                published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Tickets Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.reduce((total, event) => total + event.ticketSold, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {events
                  .reduce((total, event) => total + event.revenue, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From ticket sales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Manage and monitor your events</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="pending">Pending Review</TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search events..." className="pl-8" />
                </div>
              </div>

              <TabsContent value="all" className="space-y-4 mt-0">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </TabsContent>

              <TabsContent value="published" className="space-y-4 mt-0">
                {events
                  .filter((event) => event.publishedStatus === 'PUBLISHED')
                  .map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
              </TabsContent>

              <TabsContent value="drafts" className="space-y-4 mt-0">
                {events
                  .filter((event) => event.publishedStatus === 'DRAFT')
                  .map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4 mt-0">
                {events
                  .filter((event) => event.publishedStatus === 'PENDING_REVIEW')
                  .map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}

                {events.filter(
                  (event) => event.publishedStatus === 'PENDING_REVIEW'
                ).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                      <Loader2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-medium">No Pending Events</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-1">
                      You don't have any events waiting for review. Events
                      submitted for review will appear here.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Organizer Tips</CardTitle>
            <CardDescription>
              Best practices to maximize event success
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-1">
                  Promote Your Events
                </h3>
                <p className="text-sm text-blue-700">
                  Share your event on social media and encourage early
                  registrations with early bird discounts.
                </p>
              </div>

              <div className="p-4 rounded-md bg-green-50 border border-green-200">
                <h3 className="font-medium text-green-800 mb-1">
                  Engage with Attendees
                </h3>
                <p className="text-sm text-green-700">
                  Send pre-event communications with important details to build
                  excitement and reduce no-shows.
                </p>
              </div>

              <div className="p-4 rounded-md bg-purple-50 border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-1">
                  Analyze Performance
                </h3>
                <p className="text-sm text-purple-700">
                  Review analytics after each event to understand attendee
                  behavior and improve future events.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
