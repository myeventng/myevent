'use server';

import { auth, ErrorCode } from '@/lib/auth';
import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { redirect } from 'next/navigation';

export async function signInEmailAction(formData: FormData) {
  const email = String(formData.get('email'));
  if (!email) return { error: 'Please enter your email' };

  const password = String(formData.get('password'));
  if (!password) return { error: 'Please enter your password' };

  try {
    const result = await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email,
        password,
      },
    });

    // If successful, the session will be automatically set via cookies
    // No need to manually store in localStorage on server side
    return { error: null, success: true };
  } catch (err) {
    if (err instanceof APIError) {
      const errCode = err.body ? (err.body.code as ErrorCode) : 'UNKNOWN';
      console.dir(err, { depth: 5 });
      switch (errCode) {
        case 'EMAIL_NOT_VERIFIED':
          redirect('/auth/verify?error=email_not_verified');
        default:
          return { error: err.message };
      }
    }

    return { error: 'Internal Server Error' };
  }
}
