// app/dashboard/scanner/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { getUserEvents } from '@/actions/event.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { listStaffEventIds } from '@/lib/staff/access';
import { Badge } from '@/components/ui/badge';

export default async function ScannerIndexPage() {
  const session = await getServerSideAuth({ roles: ['USER', 'ADMIN'] });

  if (!session) {
    redirect('/unauthorized');
  }

  const eventsResponse = await getUserEvents();
  const events = eventsResponse.success ? (eventsResponse.data ?? []) : [];

  // Events this user can scan as invited staff (Scanner / Manager), read from their active memberships.
  const owned = new Set(events.map((e) => e.id));
  const staffIds = (await listStaffEventIds(session.user.id, 'SCAN_TICKETS')).flatMap((m) => m.eventIds).filter((id) => !owned.has(id));
  const staffEvents = staffIds.length
    ? await prisma.event.findMany({ where: { id: { in: staffIds } }, select: { id: true, title: true, startDateTime: true }, orderBy: { startDateTime: 'desc' } })
    : [];
  const modes = new Map(
    (await prisma.eventScannerSettings.findMany({ where: { eventId: { in: [...owned, ...staffIds] } }, select: { eventId: true, mode: true } })).map((m) => [m.eventId, m.mode]),
  );
  const modeLabel = (id: string) => (modes.get(id) === 'INBUILT_ONLY' ? 'Inbuilt scanner only' : 'Universal scanner');

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Scanner</h1>
          <p className="text-muted-foreground">
            Select an event to start scanning tickets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            // ✅ Calculate total tickets from ticketTypes
            const totalTickets = event.ticketTypes?.reduce(
              (total, ticketType) => total + (ticketType.tickets?.length || 0),
              0
            ) || 0 + (event.physicalIssued ?? 0); // online + physical: both are scannable

            return (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    {event.title}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">{modeLabel(event.id)}</Badge>
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
                  <Button asChild variant="outline" className="mb-2 w-full">
                    <Link href={`/dashboard/events/${event.id}/scanner-settings`}>Scanner settings</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/scanner/${event.id}`}>
                      Open Scanner
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {staffEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Events you scan for (staff)</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {staffEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />{event.title}</CardTitle>
                    <Badge variant="outline" className="w-fit">{modeLabel(event.id)}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(event.startDateTime).toLocaleDateString()}</p>
                    <Button asChild className="w-full"><Link href={`/dashboard/scanner/${event.id}`}>Open Scanner</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}