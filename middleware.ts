import NextAuth from 'next-auth';
import authConfig from './auth.config';
import {
  DEFAULT_LOGIN_REDIRECT,
  authRoutes,
  publicRoutes,
  apiAuthPrefix,
} from './routes';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  console.log('Route:', req.nextUrl.pathname);
  console.log('Is logged in:', isLoggedIn);

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Allow API authentication requests
  if (isApiAuthRoute) {
    return null;
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    console.log('User is logged in, redirecting to dashboard...');
    return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, req.nextUrl));
  }

  // Redirect unauthenticated users to login page
  if (!isLoggedIn && !isPublicRoute && nextUrl.pathname !== '/login') {
    console.log('User is not logged in, redirecting to login...');
    return Response.redirect(new URL('/login', req.nextUrl));
  }

  return null;
});

// Middleware matcher (ensures it excludes static assets)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
