import { Suspense } from 'react';
import { AdminSettings } from '@/components/admin/admin-settings';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

async function AdminSettingsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const isUserSuperAdmin = session.user.subRole === 'SUPER_ADMIN';

  return (
    <DashboardLayout session={session}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-64">
            <div className="text-lg">Loading settings...</div>
          </div>
        }
      >
        <AdminSettings session={session} isUserSuperAdmin={isUserSuperAdmin} />
      </Suspense>
    </DashboardLayout>
  );
}

export default AdminSettingsPage;
