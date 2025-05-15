// lib/client-auth-utils.ts
import type { AuthUser } from '@/lib/auth-utils';

/**
 * Client-side function to check if user is an admin (ADMIN role with STAFF or SUPER_ADMIN subrole)
 */
export function isAdmin(user: AuthUser): boolean {
  return (
    user.role === 'ADMIN' &&
    (user.subRole === 'STAFF' || user.subRole === 'SUPER_ADMIN')
  );
}

/**
 * Client-side function to check if user is an organizer (USER role with ORGANIZER subrole)
 */
export function isOrganizer(user: AuthUser): boolean {
  return user.role === 'USER' && user.subRole === 'ORGANIZER';
}

/**
 * Client-side function to check if user is a regular user (USER role with ORDINARY subrole)
 */
export function isOrdinaryUser(user: AuthUser): boolean {
  return user.role === 'USER' && user.subRole === 'ORDINARY';
}

/**
 * Client-side function to check if user is a super admin (ADMIN role with SUPER_ADMIN subrole)
 */
export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN' && user.subRole === 'SUPER_ADMIN';
}

/**
 * Component to conditionally render content based on user role/subrole
 */
export function RoleBasedElement({
  children,
  allowedRoles,
  allowedSubRoles,
  user,
  fallback,
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'USER'>;
  allowedSubRoles?: Array<'ORDINARY' | 'ORGANIZER' | 'STAFF' | 'SUPER_ADMIN'>;
  user: AuthUser;
  fallback?: React.ReactNode;
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
