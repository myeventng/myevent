import type { AuthUser } from './auth-types';

// Shared utility functions for role checking (can be used on both client and server)
export function isAdmin(user: AuthUser): boolean {
  return (
    user.role === 'ADMIN' &&
    (user.subRole === 'STAFF' || user.subRole === 'SUPER_ADMIN')
  );
}

export function isOrganizer(user: AuthUser): boolean {
  return user.role === 'USER' && user.subRole === 'ORGANIZER';
}

export function isOrdinaryUser(user: AuthUser): boolean {
  return user.role === 'USER' && user.subRole === 'ORDINARY';
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN' && user.subRole === 'SUPER_ADMIN';
}

export function getDashboardUrl(user: AuthUser): string {
  return isAdmin(user) ? '/admin/dashboard' : '/dashboard';
}

export function getProfileUrl(user: AuthUser): string {
  return isAdmin(user) ? '/admin/dashboard/profile' : '/dashboard/profile';
}

export function getSettingsUrl(user: AuthUser): string {
  return isAdmin(user) ? '/admin/dashboard/settings' : '/dashboard/settings';
}

// Helper function to safely convert session user to AuthUser
export function convertSessionUser(sessionUser: any): AuthUser {
  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image || undefined, // Convert null to undefined
    createdAt: sessionUser.createdAt,
    role: sessionUser.role,
    subRole: sessionUser.subRole,
    giraffeFact: sessionUser.giraffeFact,
  };
}

// Navigation filtering helper
export function filterNavigation(
  navigation: Array<{
    name: string;
    href: string;
    requiresAuth?: boolean;
    roles?: string[];
  }>,
  user?: AuthUser
) {
  return navigation.filter((item) => {
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (!item.roles) return true;
    return item.roles.includes(user.subRole) || item.roles.includes(user.role);
  });
}
