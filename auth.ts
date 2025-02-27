import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './lib/database';
import authConfig from './auth.config';
import { getUserById } from './lib/actions/user.action';
import { getTwoFactorConfirmationByUserId } from './lib/tokens/two-factor-confirmation';
//  import Facebook from 'next-auth/providers/facebook';
import { Role } from '@prisma/client';

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  pages: {
    signIn: '/login',
    error: '/error',
  },
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // allow google sign in with email and password and without email verification
      if (account?.provider !== 'credentials') return true;

      const existingUser = await getUserById(user.id as string);
      console.log(existingUser);

      // prevent login without email verification
      if (!existingUser?.emailVerified) return false;

      //2FA
      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id
        );

        console.log({
          twoFactorConfirmation,
        });

        if (!twoFactorConfirmation) return false;

        //delete 2FA for sign in
        await db.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as Role;
      }

      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;
      token.role = existingUser.role;
      return token;
    },
  },

  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  ...authConfig,
});
