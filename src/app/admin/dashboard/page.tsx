import { DashboardLayout } from '@/components/dashboard-layout';
import { StatsCard } from '@/components/stats-card';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
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
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  // Check if the user is a super admin for certain privileged actions
  const isUserSuperAdmin = isSuperAdmin(session.user);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        {/* Statistics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value="2,543"
            description="Active users on the platform"
            icon={<Users className="w-4 h-4" />}
            change={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Events"
            value="182"
            description="Active events on the platform"
            icon={<Calendar className="w-4 h-4" />}
            change={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Venues"
            value="64"
            description="Registered venues"
            icon={<MapPin className="w-4 h-4" />}
            change={{ value: 4, isPositive: true }}
          />
          <StatsCard
            title="Tickets Sold"
            value="12,458"
            description="Total tickets sold"
            icon={<Ticket className="w-4 h-4" />}
            change={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Admin Alert Section */}
        {isUserSuperAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Super Admin Access</AlertTitle>
            <AlertDescription>
              You have elevated privileges. Changes you make affect the entire
              platform.
            </AlertDescription>
          </Alert>
        )}

        {/* Content Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items requiring review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-amber-800">
                        New Events (8)
                      </p>
                      <p className="text-sm text-amber-700">
                        Events awaiting approval
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-800 border-amber-800"
                    >
                      Review
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-blue-800">
                        Venue Registrations (3)
                      </p>
                      <p className="text-sm text-blue-700">
                        New venues pending verification
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-800 border-blue-800"
                    >
                      Review
                    </Button>
                  </div>
                </div>
                {isUserSuperAdmin && (
                  <div className="p-3 rounded-md bg-purple-50 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-purple-800">
                          Organizer Applications (5)
                        </p>
                        <p className="text-sm text-purple-700">
                          Users requesting organizer status
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-800 border-purple-800"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                )}
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
                <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">
                      Payment Processing
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">Event Creation</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">
                      Ticket Validation
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-green-800 border-green-800"
                  >
                    Operational
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

          {/* Recent Activity - Only for Super Admins */}
          {isUserSuperAdmin && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Admin Activity Log</CardTitle>
                <CardDescription>
                  Recent system changes by administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Sarah Johnson (Staff)</p>
                      <p className="text-sm text-muted-foreground">
                        Approved 3 new events
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Today at 14:35
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Michael Chen (Super Admin)</p>
                      <p className="text-sm text-muted-foreground">
                        Updated system settings
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Today at 11:20
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Alex Wong (Staff)</p>
                      <p className="text-sm text-muted-foreground">
                        Verified new venue: Grand Ballroom
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Yesterday at 16:45
                      </p>
                    </div>
                  </div>
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
