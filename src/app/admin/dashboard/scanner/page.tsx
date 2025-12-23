import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { getUserEvents } from '@/actions/event.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ScannerIndexPage() {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });

  if (!session) {
    redirect('/unauthorized');
  }

  const eventsResponse = await getUserEvents();
  const events = eventsResponse.success ? (eventsResponse.data ?? []) : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Scanner</h1>
          <p className="text-muted-foreground">Select an event to start scanning tickets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            // Calculate total tickets from ticketTypes
            const totalTickets =
              event.ticketTypes?.reduce(
                (total, ticketType) => total + (ticketType.tickets?.length || 0),
                0
              ) || 0;

            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {event.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {totalTickets} tickets sold
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/admin/dashboard/scanner/${event.id}`}>Open Scanner</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}