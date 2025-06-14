import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { getServerSideAuth } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/auth-utils';
import { TagsTable } from '@/components/tags/tag-table';
import { getTags } from '@/actions/tag.actions';
import { redirect } from 'next/navigation';

export default async function Tags() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch tags from database
  const response = await getTags();
  const tags = response.success ? response.data : [];

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tags Management</h1>
            <p className="text-muted-foreground">
              Manage event tags to help users discover and categorize events.
              Tags are used to label and filter events by topics or themes.
            </p>
          </div>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        <TagsTable
          initialData={tags ?? []}
          userCanCreate={isUserSuperAdmin || session.user.subRole === 'STAFF'}
        />
      </div>
    </DashboardLayout>
  );
}
