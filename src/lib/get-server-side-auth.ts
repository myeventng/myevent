import { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type RoleType = 'ADMIN' | 'USER';
type SubRoleType = 'ORDINARY' | 'ORGANIZER' | 'STAFF' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  role: RoleType;
  subRole: SubRoleType;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    expiresAt: Date;
    token: string;
    userAgent?: string;
  };
}

/**
 * Server component utility to get the authenticated user
 * with proper type checking and role/subrole information
 */
export async function getServerSideAuth(requiredRoles?: {
  roles?: RoleType[];
  subRoles?: SubRoleType[];
}): Promise<AuthSession> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    redirect('/auth/login');
  }

  // Check role restrictions if provided
  if (requiredRoles) {
    const hasRequiredRole = requiredRoles.roles
      ? requiredRoles.roles.includes(session.user.role as RoleType)
      : true;

    const hasRequiredSubRole = requiredRoles.subRoles
      ? requiredRoles.subRoles.includes(session.user.subRole as SubRoleType)
      : true;

    if (!hasRequiredRole || !hasRequiredSubRole) {
      redirect('/unauthorized');
    }
  }

  return session as AuthSession;
}
