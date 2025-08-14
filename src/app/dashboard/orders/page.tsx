// src/app/dashboard/orders/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { OrganizerOrderManagement } from '@/components/organizer/organizer-order-management';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getOrganizerOrders } from '@/actions/order.actions';

export default async function OrganizerOrdersPage() {
  const session = await getServerSideAuth({
    roles: ['USER', 'ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  // Only allow organizers
  if (session.user.subRole !== 'ORGANIZER' && session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  // Fetch initial orders data for the organizer
  const ordersResponse = await getOrganizerOrders();
  const initialOrders: any[] = Array.isArray(ordersResponse.data)
    ? ordersResponse.data
    : [];

  return (
    <DashboardLayout session={session}>
      <OrganizerOrderManagement
        initialOrders={initialOrders}
        userRole={session.user.role}
        userSubRole={session.user.subRole}
      />
    </DashboardLayout>
  );
}
