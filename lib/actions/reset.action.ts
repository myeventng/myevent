'use server';
import { z } from 'zod';

import { ResetSchema } from '@/schemas';
import { getUserByEmail } from './user.action';
import { sendPasswordResetEmail } from '../mail';
import { generatePasswordResetByToken } from '../tokens/token';

export const reset = async (values: z.infer<typeof ResetSchema>) => {
  const validateFields = ResetSchema.safeParse(values);
  if (!validateFields.success) {
    return { error: 'Invalid Email!' };
  }
  const { email } = validateFields.data;

  const user = await getUserByEmail(email);
  if (!user) return { error: 'Email does not exist!' };

  const passwordResetToken = await generatePasswordResetByToken(email);
  await sendPasswordResetEmail(
    passwordResetToken.email,
    passwordResetToken.token
  );

  return { success: 'Email sent!' };
};
