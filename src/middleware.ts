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

// Routes that should be accessible during maintenance mode
const maintenanceBypassRoutes = [
  '/admin',
  '/api/admin',
  '/api/auth',
  '/api/webhook',
  '/maintenance',
  '/api/maintenance',
];

// Simplified cache - just boolean and timestamp
let maintenanceCache = { enabled: false, lastCheck: 0 };
const CACHE_DURATION = 30000; // 30 seconds

// Simple function to check maintenance mode without external API calls
async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if still fresh
  if (now - maintenanceCache.lastCheck < CACHE_DURATION) {
    return maintenanceCache.enabled;
  }

  try {
    // Instead of making an API call, we'll use a simpler approach
    // You can replace this with direct database access if needed
    // For now, we'll check environment variable or return false
    const maintenance = process.env.MAINTENANCE_MODE === 'true';

    maintenanceCache = {
      enabled: maintenance,
      lastCheck: now,
    };

    return maintenance;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return maintenanceCache.enabled;
  }
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Skip maintenance and auth checks for static files and API routes that should always work
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhook/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  try {
    // Check maintenance mode first (only for non-bypass routes)
    const shouldBypassMaintenance = maintenanceBypassRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!shouldBypassMaintenance) {
      const maintenanceMode = await isMaintenanceMode();

      if (maintenanceMode && pathname !== '/maintenance') {
        return NextResponse.redirect(new URL('/maintenance', req.url));
      }

      if (!maintenanceMode && pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Get session for auth checks
    let session = null;
    try {
      const sessionResponse = await fetch(
        new URL('/api/auth/get-session', req.url),
        {
          method: 'GET',
          headers: {
            cookie: req.headers.get('cookie') || '',
            'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
            'user-agent': req.headers.get('user-agent') || '',
          },
          cache: 'no-store',
        }
      );

      if (sessionResponse.ok) {
        session = await sessionResponse.json();
      }
    } catch (sessionError) {
      console.error('Session fetch error:', sessionError);
      // Continue without session - will be handled by auth logic below
    }

    const isLoggedIn = !!session?.user;
    const isAdmin = session?.user?.role === 'ADMIN';

    const isOnProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isOnAuthRoute = authRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isOnAdminRoute = pathname.startsWith('/admin');

    // Admin route access control
    if (isOnAdminRoute && isLoggedIn && !isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protected route access control
    if (isOnProtectedRoute && !isLoggedIn) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Auth route redirect for logged-in users
    if (isOnAuthRoute && isLoggedIn) {
      return NextResponse.redirect(new URL('/events', req.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);

    // On error, only redirect to login if it's a protected route
    const isOnProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isOnProtectedRoute) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
