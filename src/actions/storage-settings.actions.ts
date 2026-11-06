'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActiveProvider, setActiveProvider } from '@/lib/storage/provider';
import { getR2Status, testR2Connection, type R2Status } from '@/lib/storage/r2';
import type { StorageProviderName } from '@/lib/storage/rules';

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; role?: string; subRole?: string } | undefined;
  if (!u || u.role !== 'ADMIN' || u.subRole !== 'SUPER_ADMIN') {
    throw new Error('Only a Super Admin can manage storage settings');
  }
  return u;
}

export interface StorageSettingsView {
  provider: StorageProviderName;
  r2: R2Status;
  publicBaseUrl: string | null;
}

export async function getStorageSettings(): Promise<{ success: boolean; data?: StorageSettingsView; error?: string }> {
  try {
    await requireSuperAdmin();
    const base = (process.env.R2_PUBLIC_BASE_URL ?? '').trim();
    return {
      success: true,
      data: { provider: await getActiveProvider(), r2: getR2Status(), publicBaseUrl: base || null },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function saveStorageProvider(
  provider: StorageProviderName,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireSuperAdmin();
    if (provider !== 'uploadthing' && provider !== 'r2') return { success: false, error: 'Invalid provider' };
    if (provider === 'r2') {
      const s = getR2Status();
      if (!s.imagesReady) {
        return {
          success: false,
          error: 'R2 image storage is not fully configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BUCKET and R2_PUBLIC_BASE_URL on Vercel and redeploy.',
        };
      }
    }
    const before = await getActiveProvider();
    await setActiveProvider(provider);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'STORAGE_PROVIDER',
        oldValues: { provider: before },
        newValues: { provider },
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function testR2ConnectionAction(): Promise<{
  success: boolean;
  results?: { bucket: string; ok: boolean; error?: string }[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();
    if (!getR2Status().credentials) return { success: false, error: 'R2 credentials are missing' };
    return { success: true, results: await testR2Connection() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
