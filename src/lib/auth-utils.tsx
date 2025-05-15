'use server';
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

/**
 * Component to conditionally render content based on user role/subrole
 */
export async function RoleBasedElement({
  children,
  allowedRoles,
  allowedSubRoles,
  user,
  fallback,
}: {
  children: ReactNode;
  allowedRoles?: RoleType[];
  allowedSubRoles?: SubRoleType[];
  user: AuthUser;
  fallback?: ReactNode;
}) {
  const hasAllowedRole = allowedRoles ? allowedRoles.includes(user.role) : true;

  const hasAllowedSubRole = allowedSubRoles
    ? allowedSubRoles.includes(user.subRole)
    : true;

  if (hasAllowedRole && hasAllowedSubRole) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

/**
 * Function to check if user is an admin (ADMIN role with STAFF or SUPER_ADMIN subrole)
 */
export async function isAdmin(user: AuthUser): Promise<boolean> {
  return (
    user.role === 'ADMIN' &&
    (user.subRole === 'STAFF' || user.subRole === 'SUPER_ADMIN')
  );
}

/**
 * Function to check if user is an organizer (USER role with ORGANIZER subrole)
 */
export async function isOrganizer(user: AuthUser): Promise<boolean> {
  return user.role === 'USER' && user.subRole === 'ORGANIZER';
}

/**
 * Function to check if user is a regular user (USER role with ORDINARY subrole)
 */
export async function isOrdinaryUser(user: AuthUser): Promise<boolean> {
  return user.role === 'USER' && user.subRole === 'ORDINARY';
}

/**
 * Function to check if user is a super admin (ADMIN role with SUPER_ADMIN subrole)
 */
export async function isSuperAdmin(user: AuthUser): Promise<boolean> {
  return user.role === 'ADMIN' && user.subRole === 'SUPER_ADMIN';
}
