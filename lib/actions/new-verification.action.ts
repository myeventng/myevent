'use server';

import { db } from '../database';
import { getUserByEmail } from './user.action';
import { getVerificationTokenByToken } from '../tokens/verification.action';

export const newVerification = async (token: string) => {
  const verificationToken = await getVerificationTokenByToken(token);

  if (!verificationToken) return { error: 'Token does not exist!' };

  const hasExpiredToken = new Date(verificationToken.expires) < new Date();
  if (hasExpiredToken) {
    return { error: 'Token has expired!' };
  }

  const user = await getUserByEmail(verificationToken.email);

  if (!user) return { error: 'Email does not exist!' };

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), email: verificationToken.email },
  });

  await db.verificationToken.delete({ where: { id: verificationToken.id } });

  return { success: 'Email verified!' };
};
