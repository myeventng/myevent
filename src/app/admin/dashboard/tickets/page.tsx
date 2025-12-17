// src/app/admin/dashboard/tickets/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminTicketsTable } from '@/components/admin/admin-tickets-table';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getAdminTickets } from '@/actions/ticket.actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function AdminTickets() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  // Fetch tickets using the server action
  const ticketsResult = await getAdminTickets();

  // Handle error case
  if (!ticketsResult.success) {
    return (
      <DashboardLayout session={session}>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Tickets Management</h1>
              <p className="text-muted-foreground">
                View and manage all tickets in the system.
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {ticketsResult.message || 'Failed to load tickets'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const tickets = ticketsResult.data || [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <AdminTicketsTable
          initialData={tickets}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
