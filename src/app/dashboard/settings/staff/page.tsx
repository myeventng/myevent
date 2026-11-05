import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { StaffManager } from '@/components/dashboard/staff/staff-manager';

export const metadata = { title: 'Team & staff' };

export default async function StaffSettingsPage() {
  const session = await getServerSideAuth({ roles: ['USER'] });
  if (!session) redirect('/unauthorized');
  // Only organizers manage a team. (Staff members themselves cannot invite others.)
  if (session.user.subRole !== 'ORGANIZER') redirect('/unauthorized');
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team & staff</h1>
          <p className="text-sm text-muted-foreground">Give scanners and managers limited access to your events.</p>
        </div>
        <StaffManager />
      </div>
    </DashboardLayout>
  );
}
