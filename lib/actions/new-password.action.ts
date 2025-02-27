'use server';
import * as z from 'zod';

import bcrypt from 'bcryptjs';
import { NewPasswordSchema } from '@/schemas';
import { getUserByEmail } from './user.action';
import { db } from '../database';
import { getPasswordResetTokenByToken } from '../tokens/password-reset-token';

export const newPassword = async (
  values: z.infer<typeof NewPasswordSchema>,
  token?: string | null
) => {
  if (!token) {
    return { error: 'Missing token!' };
  }
  const validateFields = NewPasswordSchema.safeParse(values);
  if (!validateFields.success) {
    return { error: 'Invalid fields!' };
  }
  const { password } = validateFields.data;
  const existingToken = await getPasswordResetTokenByToken(token);

  if (!existingToken) {
    return { error: 'Token does not exist!' };
  }

  const hasExpiredToken = new Date(existingToken.expires) < new Date();
  if (hasExpiredToken) {
    return { error: 'Token has expired!' };
  }

  const user = await getUserByEmail(existingToken.email);

  console.log(existingToken.email);

  if (!user) {
    return { error: 'Email does not exist!' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await db.passwordResetToken.delete({
    where: { id: existingToken.id },
  });
  return { success: 'Password reset!' };
};
