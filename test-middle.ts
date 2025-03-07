import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
  adminRoutes,
  organizerRoutes,
} from '@/routes';
import { Role } from '@prisma/client';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role || Role.USER;
  console.log(userRole);

  const isAdmin = userRole === Role.ADMIN;
  const isOrganizer = userRole === Role.ORGANIZER || isAdmin;

  console.log('isOrganizer', isOrganizer);
  console.log('isAdmin', isAdmin);

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Check if the requested path is an admin route or starts with an admin route prefix
  const isAdminRoute = adminRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  // Check if the requested path is an organizer route or starts with an organizer route prefix
  const isOrganizerRoute = organizerRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  if (isApiAuthRoute) {
    return null;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redirect based on user role after login
      if (isAdmin || isOrganizer) {
        return Response.redirect(new URL('/admin', nextUrl));
      } else {
        return Response.redirect(new URL('/', nextUrl));
      }
      // return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return null;
  }

  // Handle admin routes
  if (isAdminRoute && !isAdmin) {
    return Response.redirect(new URL('/admin', nextUrl));
  }

  // Handle organizer routes
  if (isOrganizerRoute && !isOrganizer) {
    return Response.redirect(new URL('/', nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    return Response.redirect(
      new URL(`/auth/login?callbackUrl=${encodedCallbackUrl}`, nextUrl)
    );
  }

  return null;
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
