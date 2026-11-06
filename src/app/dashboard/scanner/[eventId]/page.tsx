import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { TicketScannerPage } from '@/components/scanner/ticket-scanner-page';
import { prisma } from '@/lib/prisma';
import { can, isOwnerOrAdmin, resolveEventAccess } from '@/lib/staff/access';
import { getScannerMode } from '@/lib/scanner/validate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ScannerPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    redirect('/unauthorized');
  }

  const { eventId } = await params;

  // Owner, platform admin, or active staff with the scan permission (checked in the database).
  const access = await resolveEventAccess({ id: session.user.id, role: session.user.role }, eventId);
  const event = access
    ? await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, startDateTime: true } })
    : null;
  if (!event) redirect('/dashboard/scanner');
  const allowed = can(access, 'SCAN_TICKETS');
  const canConfigure = isOwnerOrAdmin(access);
  const scannerMode = await getScannerMode(eventId);

  if (!allowed) {
    return (
      <DashboardLayout session={session}>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don&apos;t have permission to scan tickets for this event.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const eventDate = new Date(event.startDateTime);
  const isEventDay =
    Math.abs(eventDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Event Scanner</h1>
            <p className="text-muted-foreground">
              {event.title} - Complete scanning and analytics dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{scannerMode === 'INBUILT_ONLY' ? 'Inbuilt scanner only' : 'Universal scanner'}</Badge>
            {canConfigure && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/events/${eventId}/scanner-settings`}>Scanner settings</Link>
              </Button>
            )}
          </div>
        </div>

        {!isEventDay && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              This event is not scheduled for today. Scanner is available for
              testing purposes.
            </AlertDescription>
          </Alert>
        )}
        <TicketScannerPage
          eventId={eventId}
          eventTitle={event.title as string}
          scannerMode={scannerMode}
        />
      </div>
    </DashboardLayout>
  );
}
