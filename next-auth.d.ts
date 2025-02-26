import { Role } from '@prisma/client';
import NextAuth, { type DefaultSession } from 'next-auth';

export type ExtendedSession = DefaultSession['user'] & {
  role: Role;
  id: string;
  username: boolean;
};

declare module 'next-auth' {
  interface Session {
    user: ExtendedSession;
  }
}
