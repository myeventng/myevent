import { Role } from '@prisma/client';
import NextAuth, { type DefaultSession } from 'next-auth';

export type ExtendedUser = DefaultSession['user'] & {
  role: Role;
  isTwoFactorEnabled: boolean;
  isOAuth: boolean;
  email: sting;
};

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser;
  }
}
