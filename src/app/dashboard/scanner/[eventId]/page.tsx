import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { TicketScanner } from '@/components/scanner/ticket-scanner';
import { getEventById } from '@/actions/event.actions';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Get event details
  const eventResponse = await getEventById(eventId);

  if (!eventResponse.success || !eventResponse.data) {
    redirect('/dashboard/events');
  }

  const event = eventResponse.data;

  // Check permissions - only event organizer or admin can scan
  const isOwner = event.userId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return (
      <DashboardLayout session={session}>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to scan tickets for this event.
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
        <div>
          <h1 className="text-2xl font-bold">Ticket Scanner</h1>
          <p className="text-muted-foreground">
            Scan tickets for entry validation
          </p>
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

        <TicketScanner
          eventId={eventId as string}
          eventTitle={event.title as string}
          onScanComplete={(result: any) => {
            console.log('Scan completed:', result);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
