import { getServerSideAuth } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function AuthRedirectPage() {
  console.log('[AuthRedirect] Page loading');
  try {
    console.log('[AuthRedirect] Getting session');
    // Get the user session
    const session = await getServerSideAuth();

    if (!session) {
      console.log('[AuthRedirect] No session found, going to home page safely');
      return redirect('/');
    }

    console.log('[AuthRedirect] Session retrieved:', {
      userId: session.user.id,
      role: session.user.role,
      subRole: session.user.subRole,
    });

    // Get user role and subrole
    const userRole = session.user.role;
    const userSubRole = session.user.subRole;

    // Debug log
    console.log('Auth redirect session:', { userRole, userSubRole });

    if (!userRole || !userSubRole) {
      console.log('[AuthRedirect] Missing role data, going to safe page');
      return redirect('/');
    }

    // Redirect based on user role
    if (
      userRole === 'ADMIN' &&
      (userSubRole === 'STAFF' || userSubRole === 'SUPER_ADMIN')
    ) {
      // Admin users go to admin dashboard
      console.log('[AuthRedirect] Redirecting admin to dashboard');
      return redirect('/admin/dashboard');
    } else if (
      userRole === 'USER' &&
      (userSubRole === 'ORDINARY' || userSubRole === 'ORGANIZER')
    ) {
      console.log('[AuthRedirect] Redirecting user to dashboard');
      // Regular users go to user dashboard
      return redirect('/dashboard');
    } else {
      console.log('[AuthRedirect] Fallback redirect to events');
      // Fallback for any other role combination
      return redirect('/events');
    }
  } catch (error) {
    console.error('[AuthRedirect] Error:', error);
    // Redirect to a safe non-auth page instead of possibly looping
    return redirect('/');
  }
}
