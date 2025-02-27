'use server';
import * as z from 'zod';
import { RegisterSchema } from '@/schemas';
import { db } from '../database';

import bcrpyt from 'bcryptjs';
import { getUserByEmail } from './user.action';
import { generateVerificationToken } from '../tokens/token';
import { sendVerificationEmail } from '../mail';

export const register = async (values: z.infer<typeof RegisterSchema>) => {
  const validateFields = RegisterSchema.safeParse(values);
  if (!validateFields.success) {
    return { error: 'Invalid fields!' };
  }
  const { name, email, password, gender } = validateFields.data;

  const hashedPassword = await bcrpyt.hash(password, 10);
  const existingUser = await getUserByEmail(email);
  const username = email.split('@')[0];

  if (existingUser) {
    return { error: 'User already exists!' };
  }
  try {
    await db.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        gender: gender,
        username: username,
      },
    });

    const verificationToken = await generateVerificationToken(email);

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );

    return { success: 'Confirmation email sent!' };
  } catch (error) {
    return { error: 'Server or Network Error, try again later!' };
  }
};
