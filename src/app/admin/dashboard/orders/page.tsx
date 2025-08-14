// src/app/admin/dashboard/orders/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminOrderManagement } from '@/components/admin/admin-order-management';
import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getAllOrders } from '@/actions/order.actions';

export default async function AdminOrdersPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized');
  }

  // Fetch initial orders data
  const ordersResponse = await getAllOrders();
  const initialOrders: any[] =
    ordersResponse &&
    ordersResponse.success &&
    Array.isArray(ordersResponse.data)
      ? ordersResponse.data
      : [];

  return (
    <DashboardLayout session={session}>
      <AdminOrderManagement
        initialOrders={initialOrders}
        userRole={session.user.role}
        userSubRole={session.user.subRole}
      />
    </DashboardLayout>
  );
}
