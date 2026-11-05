// Integer-kobo money helpers. All commission / pricing arithmetic is done in
// integer kobo (NGN minor units) and basis points (1% = 100 bps) so there are
// no floating-point rounding drift between order creation, reports and payouts.

export const BPS_DENOMINATOR = 10_000;
export const MAX_BPS = 10_000; // 100.00%

/** Naira (possibly fractional) → integer kobo. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Integer kobo → naira number (display / legacy Float columns only). */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/** Percentage (e.g. 7.5) → basis points (750). Rounds to the nearest bp. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** Basis points → percentage number (750 → 7.5). */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= MAX_BPS;
}

/**
 * amountKobo * bps / 10_000, rounded half-up, using integer arithmetic only.
 * Safe for amounts up to Number.MAX_SAFE_INTEGER / 10_000 kobo (≈ ₦9 billion).
 */
export function applyBps(amountKobo: number, bps: number): number {
  if (!Number.isInteger(amountKobo) || amountKobo < 0) {
    throw new RangeError(`amountKobo must be a non-negative integer, got ${amountKobo}`);
  }
  if (!isValidBps(bps)) {
    throw new RangeError(`bps must be an integer between 0 and ${MAX_BPS}, got ${bps}`);
  }
  const product = amountKobo * bps;
  return Math.floor((product + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(koboToNaira(kobo));
}
