import { prisma } from '@/lib/prisma';
import { clearSettingsCache } from '@/lib/platform-settings';
import { STORAGE_PROVIDER_SETTING_KEY, type StorageProviderName } from './rules';
import { getR2Status } from './r2';

// Short TTL: after the super admin flips the switch the change should apply
// within seconds on every serverless instance. Reads are one tiny indexed query.
let cached: { value: StorageProviderName; at: number } | null = null;
const TTL_MS = 15_000;

export async function getActiveProvider(): Promise<StorageProviderName> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  let value: StorageProviderName = 'uploadthing';
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: STORAGE_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    if (row?.value === 'r2') value = 'r2';
  } catch (e) {
    console.error('storage provider lookup failed; defaulting to uploadthing', e);
  }
  cached = { value, at: now };
  return value;
}

/** Providers actually usable right now (R2 only when env is complete). */
export function resolveUsable(provider: StorageProviderName): StorageProviderName {
  if (provider === 'r2' && !getR2Status().imagesReady) return 'uploadthing';
  return provider;
}

export async function setActiveProvider(provider: StorageProviderName): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { key: STORAGE_PROVIDER_SETTING_KEY },
    create: { key: STORAGE_PROVIDER_SETTING_KEY, value: provider },
    update: { value: provider },
  });
  cached = null;
  clearSettingsCache(STORAGE_PROVIDER_SETTING_KEY);
}
