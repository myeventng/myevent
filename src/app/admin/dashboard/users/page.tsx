import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import UsersPage from '@/components/admin/user-page';

export default async function AdminUsersPage() {
  // Get authenticated session with proper admin role checking
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  // Fetch users from database
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      subRole: true,
      banned: true,
      banReason: true,
      banExpires: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Format dates for serialization
  const formattedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    banExpires: user.banExpires ? user.banExpires.toISOString() : null,
  }));

  return (
    <DashboardLayout session={session}>
      <UsersPage initialUsers={formattedUsers} session={session} />
    </DashboardLayout>
  );
}
