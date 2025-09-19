import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminEventsTable } from '@/components/admin/admin-events-table';
import { getEvents } from '@/actions/event.actions';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Vote, Users } from 'lucide-react';

export default async function AdminEvents() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  // Fetch all events (published and unpublished for admin view)
  const response = await getEvents(false); // false to get all events
  const events = response.success ? response.data || [] : []; // Fix: Handle undefined data

  // Calculate statistics by event type
  const eventStats = {
    total: events.length,
    standard: events.filter((e) => e.eventType === 'STANDARD').length,
    votingContest: events.filter((e) => e.eventType === 'VOTING_CONTEST')
      .length,
    invite: events.filter((e) => e.eventType === 'INVITE').length,
    published: events.filter((e) => e.publishedStatus === 'PUBLISHED').length,
    pending: events.filter((e) => e.publishedStatus === 'PENDING_REVIEW')
      .length,
    draft: events.filter((e) => e.publishedStatus === 'DRAFT').length,
    rejected: events.filter((e) => e.publishedStatus === 'REJECTED').length,
    featured: events.filter((e) => e.featured).length,
    cancelled: events.filter((e) => e.isCancelled).length,
  };

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Events Management</h1>
            <p className="text-muted-foreground">
              Manage all events in the system. You can publish, feature, and
              moderate events including voting contests and invite-only events.
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Standard</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {eventStats.standard}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voting</CardTitle>
              <Vote className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {eventStats.votingContest}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invite Only</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {eventStats.invite}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {eventStats.published}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {eventStats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {eventStats.featured}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Event Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Published: {eventStats.published}
              </Badge>
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                Pending Review: {eventStats.pending}
              </Badge>
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Draft: {eventStats.draft}
              </Badge>
              <Badge variant="outline" className="bg-red-100 text-red-800">
                Rejected: {eventStats.rejected}
              </Badge>
              {eventStats.cancelled > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  Cancelled: {eventStats.cancelled}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <AdminEventsTable
          initialData={events} // Remove the ?? [] since events is now guaranteed to be an array
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
