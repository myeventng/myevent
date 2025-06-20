import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/admin'];
const authRoutes = [
  '/auth/login',
  '/auth/login/error',
  '/auth/register',
  '/auth/register/success',
  '/auth/forgot-password',
  '/auth/forgot-password/success',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/verify/success',
];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  try {
    // Use fetch to validate session instead of importing auth directly
    const sessionResponse = await fetch(
      new URL('/api/auth/get-session', req.url),
      {
        method: 'GET',
        headers: {
          cookie: req.headers.get('cookie') || '',
          'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
          'user-agent': req.headers.get('user-agent') || '',
        },
        cache: 'no-store', // Prevent caching of session checks
      }
    );

    let session = null;
    if (sessionResponse.ok) {
      try {
        session = await sessionResponse.json();
      } catch (e) {
        console.error('Failed to parse session response:', e);
      }
    }

    const isLoggedIn = !!session?.user;

    const isOnProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isOnAuthRoute = authRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // console.log('Middleware Debug:', {
    //   pathname,
    //   isLoggedIn,
    //   isOnProtectedRoute,
    //   isOnAuthRoute,
    //   userId: session?.user?.id,
    //   sessionResponseStatus: sessionResponse.status,
    // });

    // Redirect to login if accessing protected routes without valid session
    if (isOnProtectedRoute && !isLoggedIn) {
      console.log('Redirecting to login: No valid session for protected route');
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to events page if accessing auth routes with valid session
    if (isOnAuthRoute && isLoggedIn) {
      console.log('Redirecting to events: Already logged in');
      return NextResponse.redirect(new URL('/events', req.url));
    }

    // Allow the request to proceed
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);

    // If there's an error validating the session and user is on protected route,
    // redirect to login
    const isOnProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isOnProtectedRoute) {
      console.log('Redirecting to login: Session validation error');
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For non-protected routes, allow the request to proceed
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
