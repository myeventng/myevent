'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  RoleType,
  SubRoleType,
  AuthUser,
  AuthSession,
} from './auth-types';

/**
 * Server component utility to get the authenticated user
 * with proper type checking and role/subrole information
 */
export async function getServerSideAuth(options?: {
  roles?: RoleType[];
  subRoles?: SubRoleType[];
  skipRedirect?: boolean;
}): Promise<AuthSession | null> {
  const headersList = await headers();

  try {
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      if (options?.skipRedirect) {
        return null;
      }
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

    // Convert session to match our AuthSession type
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image || undefined, // Convert null to undefined
        createdAt: session.user.createdAt,
        role: session.user.role as RoleType,
        subRole: session.user.subRole as SubRoleType,
        giraffeFact: session.user.giraffeFact,
      },
      session: {
        expiresAt: session.session.expiresAt,
        token: session.session.token,
        userAgent: session.session.userAgent,
      },
    } as AuthSession;
  } catch (error) {
    console.error('[getServerSideAuth] Error:', error);
    if (options?.skipRedirect) {
      return null;
    }
    redirect('/auth/login');
  }
}
