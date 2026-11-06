"use client";

import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  adminClient,
  customSessionClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";
import { ac, roles } from "@/lib/permissions";

// Import shared types and utilities
export type {
  RoleType,
  SubRoleType,
  AuthUser,
  AuthSession,
} from "./auth-types";
export {
  isAdmin,
  isOrganizer,
  isOrdinaryUser,
  isSuperAdmin,
  getDashboardUrl,
  getProfileUrl,
  getCachedSettingsUrl,
  convertSessionUser,
  filterNavigation,
} from "./auth-utils";

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
  resetPassword,
  updateUser,
} = authClient;

// better-auth renamed `forgetPassword` to `requestPasswordReset` in newer releases.
// Support both so the build works whichever version the installer resolves.
type PasswordResetRequest = {
  email: string;
  redirectTo?: string;
  fetchOptions?: {
    onRequest?: () => void;
    onResponse?: () => void;
    onError?: (ctx: { error: { message: string } }) => void;
    onSuccess?: () => void;
  };
};
const legacyClient = authClient as unknown as {
  requestPasswordReset?: (args: PasswordResetRequest) => Promise<unknown>;
  forgetPassword?: (args: PasswordResetRequest) => Promise<unknown>;
};
export const forgetPassword = (args: PasswordResetRequest) => {
  const fn = legacyClient.requestPasswordReset ?? legacyClient.forgetPassword;
  if (!fn)
    throw new Error(
      "Password reset is not available in the installed auth client",
    );
  return fn.call(legacyClient, args);
};
