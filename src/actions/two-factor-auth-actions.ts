// 'use server';

// import { auth } from '@/lib/auth';
// import { APIError } from 'better-auth/api';
// import { headers } from 'next/headers';
// import { revalidatePath } from 'next/cache';

// export async function generate2FASecretAction() {
//   try {
//     const headersList = await headers();

//     const response = await auth.api.enableTwoFactor({
//       headers: headersList,
//       body: {
//         password: '', // TODO: Provide the user's password here
//       },
//     });

//     return {
//       success: true,
//       data: {
//         secret: response.totpURI,
//         backupCodes: response.backupCodes,
//       },
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error generating 2FA secret:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message, data: null };
//     }
//     return {
//       success: false,
//       error: 'Failed to generate 2FA secret',
//       data: null,
//     };
//   }
// }

// export async function verify2FACodeAction(code: string) {
//   try {
//     const headersList = await headers();

//     const response = await auth.api.verifyTwoFactorOTP({
//       headers: headersList,
//       body: {
//         code: code,
//       },
//     });

//     revalidatePath('/dashboard/profile');
//     revalidatePath('/admin/dashboard/profile');

//     return {
//       success: true,
//       data: response,
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error verifying 2FA code:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message };
//     }
//     return { success: false, error: 'Failed to verify 2FA code' };
//   }
// }

// export async function enable2FAAction(code: string) {
//   try {
//     const headersList = await headers();

//     const response = await auth.api.enableTwoFactor({
//       headers: headersList,
//       body: {
//         password: '', // TODO: Provide the user's password here
//       },
//     });

//     revalidatePath('/dashboard/profile');
//     revalidatePath('/admin/dashboard/profile');

//     return {
//       success: true,
//       data: response,
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error enabling 2FA:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message };
//     }
//     return { success: false, error: 'Failed to enable 2FA' };
//   }
// }

// export async function disable2FAAction() {
//   try {
//     const headersList = await headers();

//     await auth.api.disableTwoFactor({
//       headers: headersList,
//       body: {
//         password: '', // TODO: Provide the user's password here
//       },
//     });

//     revalidatePath('/dashboard/profile');
//     revalidatePath('/admin/dashboard/profile');

//     return {
//       success: true,
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error disabling 2FA:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message };
//     }
//     return { success: false, error: 'Failed to disable 2FA' };
//   }
// }

// export async function get2FAStatusAction() {
//   try {
//     const headersList = await headers();

//     // Use the correct method name
//     const response = await auth.api.getTwoFactor({
//       headers: headersList,
//     });

//     return {
//       success: true,
//       data: {
//         isEnabled: response.enabled, // Better Auth returns 'enabled', not 'isEnabled'
//         backupCodesCount: response.backupCodesCount || 0,
//       },
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error fetching 2FA status:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message, data: { isEnabled: false } };
//     }
//     return {
//       success: false,
//       error: 'Failed to fetch 2FA status',
//       data: { isEnabled: false },
//     };
//   }
// }

// export async function verifyBackupCodeAction(code: string) {
//   try {
//     const headersList = await headers();

//     const response = await auth.api.verifyTwoFactorOTP({
//       headers: headersList,
//       body: {
//         code: code,
//       },
//     });

//     revalidatePath('/dashboard/profile');
//     revalidatePath('/admin/dashboard/profile');

//     return {
//       success: true,
//       data: response,
//       error: null,
//     };
//   } catch (err) {
//     console.error('Error verifying backup code:', err);
//     if (err instanceof APIError) {
//       return { success: false, error: err.message };
//     }
//     return { success: false, error: 'Failed to verify backup code' };
//   }
// }
