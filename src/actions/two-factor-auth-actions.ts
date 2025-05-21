'use server';

import { auth } from '@/lib/auth';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function generate2FASecretAction() {
  try {
    const headersList = await headers();

    const response = await auth.api.twoFactor.generate({
      headers: headersList,
    });

    return {
      success: true,
      data: {
        secret: response.secret,
        qrCodeUrl: response.qrCodeUrl,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error generating 2FA secret:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message, data: null };
    }
    return {
      success: false,
      error: 'Failed to generate 2FA secret',
      data: null,
    };
  }
}

export async function verify2FACodeAction(code: string) {
  try {
    const headersList = await headers();

    await auth.api.twoFactor.verify({
      headers: headersList,
      body: {
        code: code,
      },
    });

    revalidatePath('/dashboard/profile');
    revalidatePath('/admin/dashboard/profile');

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('Error verifying 2FA code:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Failed to verify 2FA code' };
  }
}

export async function disable2FAAction() {
  try {
    const headersList = await headers();

    await auth.api.twoFactor.disable({
      headers: headersList,
    });

    revalidatePath('/dashboard/profile');
    revalidatePath('/admin/dashboard/profile');

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('Error disabling 2FA:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Failed to disable 2FA' };
  }
}

export async function get2FAStatusAction() {
  try {
    const headersList = await headers();

    const response = await auth.api.twoFactor.getStatus({
      headers: headersList,
    });

    return {
      success: true,
      data: {
        isEnabled: response.isEnabled,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching 2FA status:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message, data: { isEnabled: false } };
    }
    return {
      success: false,
      error: 'Failed to fetch 2FA status',
      data: { isEnabled: false },
    };
  }
}
