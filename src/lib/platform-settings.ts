import { prisma } from '@/lib/prisma';

// Cache for frequently accessed settings
const settingsCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSetting(key: string): Promise<any> {
  const cached = settingsCache.get(key);
  const now = Date.now();

  // Return cached value if still fresh
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
      select: { value: true },
    });

    const value = setting?.value || null;

    // Cache the result
    settingsCache.set(key, {
      value,
      timestamp: now,
    });

    return value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);

    // Return cached value if available, otherwise null
    return cached?.value || null;
  }
}

export function clearSettingsCache(key?: string) {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}

export async function getPaystackConfig() {
  const [publicKey, secretKey] = await Promise.all([
    getCachedSetting('financial.paystackPublicKey'),
    getCachedSetting('financial.paystackSecretKey'),
  ]);

  return {
    publicKey: publicKey || process.env.PAYSTACK_PUBLIC_KEY,
    secretKey: secretKey || process.env.PAYSTACK_SECRET_KEY,
  };
}

export async function getPlatformFee(): Promise<number> {
  const fee = await getCachedSetting('financial.defaultPlatformFeePercentage');
  return fee || 5; // Default 5%
}

export async function isMaintenanceMode(): Promise<boolean> {
  const maintenance = await getCachedSetting('general.maintenanceMode');
  return maintenance === true;
}
