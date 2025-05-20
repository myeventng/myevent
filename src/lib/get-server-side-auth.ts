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
export async function getServerSideAuth(options?: {
  roles?: RoleType[];
  subRoles?: SubRoleType[];
  skipRedirect?: boolean;
}): Promise<AuthSession | null> {
  console.log('[getServerSideAuth] Getting headers');
  const headersList = await headers();

  try {
    console.log('[getServerSideAuth] Getting session from API');
    const session = await auth.api.getSession({
      headers: headersList,
    });

    console.log('[getServerSideAuth] Session result:', !!session);

    if (!session) {
      if (options?.skipRedirect) {
        console.log('[getServerSideAuth] No session, but skipRedirect is true');
        return null;
      }
      console.log('[getServerSideAuth] No session, redirecting to login');
      redirect('/auth/login');
    }

    // Check role restrictions if provided
    if (options?.roles || options?.subRoles) {
      const hasRequiredRole = options.roles
        ? options.roles.includes(session.user.role as RoleType)
        : true;

      const hasRequiredSubRole = options.subRoles
        ? options.subRoles.includes(session.user.subRole as SubRoleType)
        : true;

      if (!hasRequiredRole || !hasRequiredSubRole) {
        if (options?.skipRedirect) {
          return null;
        }
        redirect('/unauthorized');
      }
    }

    return session as AuthSession;
  } catch (error) {
    console.error('[getServerSideAuth] Error:', error);
    if (options?.skipRedirect) {
      return null;
    }
    redirect('/auth/login');
  }
}
