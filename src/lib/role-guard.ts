// // lib/roleGuard.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { auth } from '@/lib/auth';

// type RoleType = 'ADMIN' | 'USER';
// type SubRoleType = 'ORDINARY' | 'ORGANIZER' | 'STAFF' | 'SUPER_ADMIN';

// interface RoleGuardOptions {
//   roles?: RoleType[];
//   subRoles?: SubRoleType[];
//   redirectTo?: string;
// }

// /**
//  * Check if a user has the required roles and subroles
//  */
// export async function checkUserAccess(
//   req: NextRequest,
//   options: RoleGuardOptions = {}
// ) {
//   const session = await auth.parseRequest(req);

//   // If no session, user is not logged in
//   if (!session) {
//     return {
//       isLoggedIn: false,
//       hasAccess: false,
//     };
//   }

//   const user = session.user;
//   let hasAccess = true;

//   // Check role restrictions if provided
//   if (options.roles && options.roles.length > 0) {
//     hasAccess = hasAccess && options.roles.includes(user.role as RoleType);
//   }

//   // Check subrole restrictions if provided
//   if (options.subRoles && options.subRoles.length > 0) {
//     hasAccess =
//       hasAccess && options.subRoles.includes(user.subRole as SubRoleType);
//   }

//   return {
//     isLoggedIn: true,
//     hasAccess,
//     session,
//     user,
//   };
// }

// /**
//  * Handle role-based access control for a route
//  */
// export async function handleRouteAccess(
//   req: NextRequest,
//   options: RoleGuardOptions = {}
// ) {
//   const { isLoggedIn, hasAccess } = await checkUserAccess(req, options);

//   // Not logged in - redirect to login
//   if (!isLoggedIn) {
//     return NextResponse.redirect(new URL('/auth/login', req.url));
//   }

//   // Logged in but doesn't have access - redirect to specified page or unauthorized
//   if (!hasAccess) {
//     const redirectTo = options.redirectTo || '/unauthorized';
//     return NextResponse.redirect(new URL(redirectTo, req.url));
//   }

//   // User has access - proceed
//   return NextResponse.next();
// }

// // Pre-configured guards
// export const routeGuards = {
//   /**
//    * Guard for admin routes (ADMIN role with STAFF or SUPER_ADMIN subrole)
//    */
//   admin: (req: NextRequest) =>
//     handleRouteAccess(req, {
//       roles: ['ADMIN'],
//       subRoles: ['STAFF', 'SUPER_ADMIN'],
//       redirectTo: '/unauthorized',
//     }),

//   /**
//    * Guard for super admin routes (ADMIN role with SUPER_ADMIN subrole)
//    */
//   superAdmin: (req: NextRequest) =>
//     handleRouteAccess(req, {
//       roles: ['ADMIN'],
//       subRoles: ['SUPER_ADMIN'],
//       redirectTo: '/unauthorized',
//     }),

//   /**
//    * Guard for organizer routes (USER role with ORGANIZER subrole)
//    */
//   organizer: (req: NextRequest) =>
//     handleRouteAccess(req, {
//       roles: ['USER'],
//       subRoles: ['ORGANIZER'],
//       redirectTo: '/dashboard/become-organizer',
//     }),

//   /**
//    * Guard for any authenticated user (any role)
//    */
//   authenticated: (req: NextRequest) =>
//     handleRouteAccess(req, {
//       redirectTo: '/auth/login',
//     }),

//   /**
//    * Check if user is logged in (does not redirect)
//    */
//   isLoggedIn: async (req: NextRequest) => {
//     const { isLoggedIn } = await checkUserAccess(req);
//     return isLoggedIn;
//   },
// };
