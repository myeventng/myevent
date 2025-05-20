import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/stats-card';
import { getServerSideAuth } from '@/lib/auth-utils';
import { isOrganizer } from '@/lib/client-auth-utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, MapPin, Plus, Ticket, Users } from 'lucide-react';
import Link from 'next/link';

export default async function UserDashboardPage() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });

  const isUserOrganizer = isOrganizer(session.user);
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {isUserOrganizer && (
            <Button asChild>
              <Link href="/dashboard/create-event">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </Button>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="My Tickets"
            value="3"
            description="Active tickets for upcoming events"
            icon={<Ticket className="w-4 h-4" />}
          />

          {isUserOrganizer ? (
            <>
              <StatsCard
                title="My Events"
                value="4"
                description="Events you're hosting"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatsCard
                title="My Venues"
                value="2"
                description="Venues you manage"
                icon={<MapPin className="w-4 h-4" />}
              />
              <StatsCard
                title="Total Attendees"
                value="142"
                description="People attending your events"
                icon={<Users className="w-4 h-4" />}
                change={{ value: 12, isPositive: true }}
              />
            </>
          ) : (
            <>
              <StatsCard
                title="Past Events"
                value="6"
                description="Events you've attended"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatsCard
                title="Saved Events"
                value="5"
                description="Events you're interested in"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatsCard
                title="Friends"
                value="8"
                description="Friends on the platform"
                icon={<Users className="w-4 h-4" />}
              />
            </>
          )}
        </div>

        {/* Content Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Events you're attending soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Tech Conference 2025</p>
                    <p className="text-sm text-muted-foreground">
                      May 20, 2025 • 10:00 AM
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Music Festival</p>
                    <p className="text-sm text-muted-foreground">
                      June 5, 2025 • 4:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/tickets">View All Tickets</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Organizer-specific or Regular user content */}
          {isUserOrganizer ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Event Activity</CardTitle>
                <CardDescription>
                  Latest updates from your events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-md bg-green-50 border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-800">
                          New Registrations
                        </p>
                        <p className="text-sm text-green-700">
                          Tech Conference 2025
                        </p>
                      </div>
                      <span className="text-green-800 font-bold">+12</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-amber-800">
                          Event Reminder
                        </p>
                        <p className="text-sm text-amber-700">
                          Music Festival promotion ends tomorrow
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/events">Manage My Events</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recommended For You</CardTitle>
                <CardDescription>
                  Events you might be interested in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-blue-800">
                          Art Exhibition
                        </p>
                        <p className="text-sm text-blue-700">
                          May 25, 2025 • Downtown Gallery
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-purple-50 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-purple-800">
                          Jazz Night
                        </p>
                        <p className="text-sm text-purple-700">
                          June 15, 2025 • Blue Note Club
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/events">Browse More Events</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
