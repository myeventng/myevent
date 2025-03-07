'use server';
import * as z from 'zod';
import { db } from '../database';
import { LoginSchema } from '@/schemas';
import { signIn } from '@/auth';
import { sendTwoFactorTokenEmail, sendVerificationEmail } from '../mail';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { Role } from '@prisma/client';
import {
  generateTwoFactorToken,
  generateVerificationToken,
} from '@/lib/tokens/token';
import { getTwoFactorTokenByEmail } from '../tokens/two-factor-token';
import { AuthError } from 'next-auth';
import { getUserByEmail } from './user.action';
import { getTwoFactorConfirmationByUserId } from '../tokens/two-factor-confirmation';

export const login = async (
  values: z.infer<typeof LoginSchema>,
  callbackUrl?: string | null
) => {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Invalid fields!' };
  }

  const { email, password, code } = validatedFields.data;
  console.log(email, password, code);

  const existingUser = await getUserByEmail(email);
  console.log(existingUser);

  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: 'Email does not exist!' };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email
    );

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );

    return { success: 'Confirmation email sent!' };
  }

  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    if (code) {
      const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

      if (!twoFactorToken) {
        return { error: 'Invalid code!' };
      }

      if (twoFactorToken.token !== code) {
        return { error: 'Invalid code!' };
      }

      const hasExpired = new Date(twoFactorToken.expires) < new Date();

      if (hasExpired) {
        return { error: 'Code expired!' };
      }

      await db.twoFactorToken.delete({
        where: { id: twoFactorToken.id },
      });

      const existingConfirmation = await getTwoFactorConfirmationByUserId(
        existingUser.id
      );

      if (existingConfirmation) {
        await db.twoFactorConfirmation.delete({
          where: { id: existingConfirmation.id },
        });
      }

      await db.twoFactorConfirmation.create({
        data: {
          userId: existingUser.id,
        },
      });
    } else {
      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);

      return { twoFactor: true };
    }
  }

  let redirectTo = callbackUrl || DEFAULT_LOGIN_REDIRECT;
  if (
    existingUser.role === Role.ADMIN ||
    existingUser.role === Role.ORGANIZER
  ) {
    redirectTo = '/admin';
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: callbackUrl || DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials!' };
        default:
          return { error: 'Something went wrong!' };
      }
    }

    throw error;
  }
};
