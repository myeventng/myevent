'use server';
import * as z from 'zod';
import { LoginSchema } from '@/schemas';
import { signIn } from '@/auth';
import { db } from '../database';
import { sendTwoFactorTokenEmail, sendVerificationEmail } from '../mail';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import {
  generateTwoFactorToken,
  generateVerificationToken,
} from '@/lib/tokens/token';
import { getTwoFactorTokenByEmail } from '../tokens/two-factor-token';
import { AuthError } from 'next-auth';
import { getUserByEmail } from './user.action';
import { getTwoFactorConfirmationByUserId } from '../tokens/two-factor-confirmation';

export const login = async (values: z.infer<typeof LoginSchema>) => {
  try {
    console.log('🚀 Attempting login...', values);

    const validateFields = LoginSchema.safeParse(values);
    if (!validateFields.success) {
      return { error: 'Invalid fields!' };
    }

    const { email, password, code } = validateFields.data;
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
      return { success: 'Confirmation email sent' };
    }

    if (existingUser.isTwoFactorEnabled) {
      if (code) {
        ///with 2FA Code
        const twoFactorToken = await getTwoFactorTokenByEmail(
          existingUser.email
        );
        if (!twoFactorToken || twoFactorToken.token !== code) {
          return { error: 'Invalid code!' };
        }
        if (new Date(twoFactorToken.expires) < new Date()) {
          return { error: 'Code Expired!' };
        }

        await db.twoFactorToken.delete({ where: { id: twoFactorToken.id } });
        await db.twoFactorConfirmation.create({
          data: { userId: existingUser.id },
        });
        const existingConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id
        );
        if (!existingConfirmation) {
          await db.twoFactorConfirmation.delete({
            where: { id: existingConfirmation.id },
          });
        }
        await db.twoFactorConfirmation.create({
          data: { userId: existingUser.id },
        });
      } else {
        ///without 2FA
        const twoFactorToken = await generateTwoFactorToken(existingUser.email);
        await sendTwoFactorTokenEmail(
          twoFactorToken.email,
          twoFactorToken.token
        );
        return { twoFactor: true };
      }
    }

    // 🚨 Fix: Prevent auto-redirect, capture result instead
    try {
      await signIn('Credentials', {
        email,
        password,
        redirectTo: DEFAULT_LOGIN_REDIRECT,
      });
      //  return { success: 'Login successful!' };

      //   console.log('🟢 Sign-in result:', result);

      //   if (result?.error) {
      //     return { error: 'Invalid credentials!' };
      //   }

      return { success: 'Login successful!' };
    } catch (error: any) {
      console.error('❌ Login error:', error);

      if (
        error.code === 'ECONNREFUSED' ||
        error.message.includes('NetworkError')
      ) {
        return {
          error:
            'Network error! Please check your internet connection and try again.',
        };
      }

      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return { error: 'Invalid credentials!' };
          default:
            return { error: 'Something went wrong!' };
        }
      }

      return { error: 'Unexpected error! Please try again later.' };
    }
  } catch (error) {
    return { error: 'Unexpected error! Please try again.' };
  }
};
