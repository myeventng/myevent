import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminTicketsTable } from '@/components/admin/admin-tickets-table';
import { getServerSideAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export default async function AdminTickets() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Only allow admins
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  // Fetch all tickets with related data
  const tickets = await prisma.ticket.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ticketType: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDateTime: true,
              venue: {
                select: {
                  name: true,
                  city: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      purchasedAt: 'desc',
    },
  });

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tickets Management</h1>
            <p className="text-muted-foreground">
              View and manage all tickets in the system. Track ticket sales and
              handle refunds.
            </p>
          </div>
        </div>

        <AdminTicketsTable
          initialData={tickets ?? []}
          userRole={session.user.role}
          userSubRole={session.user.subRole}
        />
      </div>
    </DashboardLayout>
  );
}
