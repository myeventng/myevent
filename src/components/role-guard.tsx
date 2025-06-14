import { getServerSideAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';



interface RoleGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireOrganizer?: boolean;
}

export async function RoleGuard({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  requireOrganizer = false,
}: RoleGuardProps) {
  const session = await getServerSideAuth();

  if (!session || !session.user) {
    redirect('/unauthorized');
    return null;
  }

  const userRole = session.user.role;
  const userSubRole = session.user.subRole;

  // Check for super admin access
  if (requireSuperAdmin) {
    const hasSuperAdminAccess =
      userRole === 'ADMIN' && userSubRole === 'SUPER_ADMIN';

    if (!hasSuperAdminAccess) {
      redirect('/unauthorized');
    }
  }

  // Check for admin access
  if (requireAdmin) {
    const hasAdminAccess =
      userRole === 'ADMIN' &&
      (userSubRole === 'STAFF' || userSubRole === 'SUPER_ADMIN');

    if (!hasAdminAccess) {
      redirect('/unauthorized');
    }
  }

  // Check for organizer access
  if (requireOrganizer) {
    const hasOrganizerAccess =
      (userRole === 'USER' && userSubRole === 'ORGANIZER') ||
      userRole === 'ADMIN'; // Admins can also access organizer routes

    if (!hasOrganizerAccess) {
      redirect('/dashboard/become-organizer');
    }
  }

  // If we get here, the user has the required access
  return <>{children}</>;
}
