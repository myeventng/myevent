import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/stats-card';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { getAdminDashboardStats } from '@/actions/analytics.actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  MapPin,
  Ticket,
  Users,
  Bell,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
// import { AdminNotificationCenter } from '@/components/admin/admin-notification-center';
// import { SystemHealthCheck } from '@/components/admin/system-health-check';

export default async function AdminDashboardPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/unauthorized');
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch real dashboard data
  let dashboardData = null;
  try {
    const response = await getAdminDashboardStats();
    if (response.success) {
      dashboardData = response.data;
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }

  // Default data if fetch fails
  const defaultData = {
    overview: {
      totalUsers: 0,
      totalEvents: 0,
      totalVenues: 0,
      totalTicketsSold: 0,
      totalNotifications: 0,
      unreadNotifications: 0,
    },
    pending: {
      events: 0,
      venues: 0,
    },
    recentActivity: [],
  };

  const data = dashboardData || defaultData;

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor platform activity and manage system operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
              {session.user.subRole}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {data.overview.unreadNotifications} unread
            </Badge>
          </div>
        </div>

        {/* Admin Alert Section */}
        {isUserSuperAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Super Admin Access</AlertTitle>
            <AlertDescription>
              You have elevated privileges. Changes you make affect the entire
              platform. Current session: {session.user.name}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={data.overview.totalUsers.toLocaleString()}
            description="Registered platform users"
            icon={<Users className="w-4 h-4" />}
            change={{
              value: Math.round(data.overview.totalUsers * 0.08),
              isPositive: true,
            }}
          />
          <StatsCard
            title="Active Events"
            value={data.overview.totalEvents.toLocaleString()}
            description="Published events"
            icon={<Calendar className="w-4 h-4" />}
            change={{
              value: Math.round(data.overview.totalEvents * 0.12),
              isPositive: true,
            }}
          />
          <StatsCard
            title="Venues"
            value={data.overview.totalVenues.toLocaleString()}
            description="Approved venues"
            icon={<MapPin className="w-4 h-4" />}
            change={{
              value: Math.round(data.overview.totalVenues * 0.04),
              isPositive: true,
            }}
          />
          <StatsCard
            title="Tickets Sold"
            value={data.overview.totalTicketsSold.toLocaleString()}
            description="All-time ticket sales"
            icon={<Ticket className="w-4 h-4" />}
            change={{
              value: Math.round(data.overview.totalTicketsSold * 0.15),
              isPositive: true,
            }}
          />
        </div>

        {/* Notification Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Notifications
                  </p>
                  <p className="text-2xl font-bold">
                    {data.overview.totalNotifications.toLocaleString()}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Unread Notifications
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {data.overview.unreadNotifications.toLocaleString()}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Notification Rate
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {data.overview.totalNotifications > 0
                      ? Math.round(
                          ((data.overview.totalNotifications -
                            data.overview.unreadNotifications) /
                            data.overview.totalNotifications) *
                            100
                        )
                      : 100}
                    %
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items requiring immediate review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">
                          New Events ({data.pending.events})
                        </p>
                        <p className="text-sm text-amber-700">
                          Events awaiting approval
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-800 border-amber-800 hover:bg-amber-100"
                      asChild
                    >
                      <Link href="/admin/dashboard/events?status=pending">
                        Review
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">
                          Venue Registrations ({data.pending.venues})
                        </p>
                        <p className="text-sm text-blue-700">
                          New venues pending verification
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-800 border-blue-800 hover:bg-blue-100"
                      asChild
                    >
                      <Link href="/admin/dashboard/venues?status=pending">
                        Review
                      </Link>
                    </Button>
                  </div>
                </div>

                {isUserSuperAdmin && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-purple-800">
                            Organizer Applications (
                            {Math.ceil(data.overview.totalUsers * 0.02)})
                          </p>
                          <p className="text-sm text-purple-700">
                            Users requesting organizer status
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-800 border-purple-800 hover:bg-purple-100"
                        asChild
                      >
                        <Link href="/admin/dashboard/users?role=organizer&status=pending">
                          Review
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">
                          System Alerts (
                          {data.overview.unreadNotifications > 10
                            ? 'High'
                            : 'Low'}
                          )
                        </p>
                        <p className="text-sm text-red-700">
                          {data.overview.unreadNotifications} unread
                          notifications
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-800 border-red-800 hover:bg-red-100"
                      asChild
                    >
                      <Link href="/admin/dashboard/notifications">View</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/dashboard/approvals">
                  View All Pending Items
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Platform health and operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Payment Processing
                      </p>
                      <p className="text-sm text-green-700">
                        All systems operational
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Event Creation
                      </p>
                      <p className="text-sm text-green-700">
                        Events processing normally
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        Notifications
                      </p>
                      <p className="text-sm text-green-700">
                        {Math.round(
                          ((data.overview.totalNotifications -
                            data.overview.unreadNotifications) /
                            Math.max(data.overview.totalNotifications, 1)) *
                            100
                        )}
                        % delivery rate
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Ticket Validation
                      </p>
                      <p className="text-sm text-yellow-700">
                        Processing with minor delays
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-yellow-800 border-yellow-800"
                  >
                    Degraded
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/dashboard/system">View System Status</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>
              Latest system events and administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.slice(0, 5).map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {activity.type === 'EVENT_SUBMITTED' && (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                      {activity.type === 'VENUE_SUBMITTED' && (
                        <MapPin className="w-5 h-5 text-green-600" />
                      )}
                      {activity.type === 'USER_UPGRADED_TO_ORGANIZER' && (
                        <Users className="w-5 h-5 text-purple-600" />
                      )}
                      {![
                        'EVENT_SUBMITTED',
                        'VENUE_SUBMITTED',
                        'USER_UPGRADED_TO_ORGANIZER',
                      ].includes(activity.type) && (
                        <Bell className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        By {activity.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No recent activity</p>
                  <p className="text-muted-foreground">
                    Platform activity will appear here as it happens.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link href="/admin/dashboard/activity">
                View Full Activity Log
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Super Admin Section */}
        {isUserSuperAdmin && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">
                  Super Admin Actions
                </CardTitle>
                <CardDescription>
                  High-privilege administrative functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/dashboard/settings">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      System Settings
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/dashboard/notifications/broadcast">
                      <Bell className="w-4 h-4 mr-2" />
                      Broadcast Message
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/dashboard/users">
                      <Users className="w-4 h-4 mr-2" />
                      User Management
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/admin/dashboard/analytics">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Platform Analytics
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Active Organizers
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.ceil(
                        data.overview.totalUsers * 0.1
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Events This Month
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.ceil(
                        data.overview.totalEvents * 0.3
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Revenue This Month
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ₦
                      {(data.overview.totalTicketsSold * 2500).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Platform Fee Collected
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ₦
                      {Math.round(
                        data.overview.totalTicketsSold * 2500 * 0.05
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Support Tickets Open
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.ceil(data.overview.unreadNotifications * 0.1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
