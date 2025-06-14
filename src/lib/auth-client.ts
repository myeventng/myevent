'use client';

import { createAuthClient } from 'better-auth/react';
import {
  inferAdditionalFields,
  adminClient,
  customSessionClient,
  magicLinkClient,
} from 'better-auth/client/plugins';
import type { auth } from '@/lib/auth';
import { ac, roles } from '@/lib/permissions';

// Import shared types and utilities
export type {
  RoleType,
  SubRoleType,
  AuthUser,
  AuthSession,
} from './auth-types';
export {
  isAdmin,
  isOrganizer,
  isOrdinaryUser,
  isSuperAdmin,
  getDashboardUrl,
  getProfileUrl,
  getSettingsUrl,
  convertSessionUser,
  filterNavigation,
} from './auth-utils';

// Auth Client
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({ ac, roles }),
    customSessionClient<typeof auth>(),
    magicLinkClient(),
  ],
});

// Export all auth functions
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  admin,
  sendVerificationEmail,
  forgetPassword,
  resetPassword,
  updateUser,
} = authClient;
