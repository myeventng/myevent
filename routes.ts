/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
 */
export const publicRoutes = [
  '/',
  '/auth/new-verification',
  '/api/uploadthing',
  '/api/uploadthing/delete',
];

/**
 * An array of routes that are used for authentication
 * These routes will redirect logged in users to /settings
 * @type {string[]}
 */
export const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/reset',
  '/auth/new-password',
];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication purposes
 * @type {string}
 */
export const apiAuthPrefix = '/api/auth';

/**
 * The default redirect path after logging in
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = '/';

/**
 * Admin routes that require ADMIN role
 * @type {string[]}
 */
export const adminRoutes = [
  '/admin/users',
  '/admin/users/add',
  '/admin/cities',
  '/admin/cities/add',
  '/admin/cities/edit',
];

/**
 * Routes that require ADMIN or ORGANIZER role
 * @type {string[]}
 */
export const organizerRoutes = [
  '/admin',
  '/admin/events',
  '/admin/events/add',
  '/admin/events/admin',
  '/admin/categories',
  '/admin/categories/add',
];
