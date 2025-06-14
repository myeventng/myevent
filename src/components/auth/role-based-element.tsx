'use client';

import { ReactNode } from 'react';
import { AuthUser, RoleType, SubRoleType } from '@/lib/auth-client';

/**
 * Client-side component to conditionally render content based on user role/subrole
 */
export function RoleBasedElement({
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
 * Server-side component to conditionally render content based on user role/subrole
 * Use this in server components
 */
export function ServerRoleBasedElement({
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
