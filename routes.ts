export const publicRoutes = [
  '/',
  '/events',
  '/register',
  '/login',
  '/error',
  '/new-verification',
  '/reset',
  '/new-password',
];

export const authRoutes = [
  '/login',
  '/register',
  // '/reset',
  // '/new-password',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/admin',
];

export const apiAuthPrefix = '/api/auth';

export const DEFAULT_LOGIN_REDIRECT = '/settings';
