// Deterministic physical-ticket generation pricing. Pure functions; tiers are
// editable database records (TicketGenerationPricingTier), never hard-coded.

export interface TierLike {
  id: string;
  label?: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  feeKobo: number;
  isActive: boolean;
}

export interface TierRange {
  minQuantity: number;
  maxQuantity: number | null;
}

export function tierContains(tier: TierRange, quantity: number): boolean {
  return quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity);
}

/**
 * Select the tier for `quantity` among ACTIVE tiers. Validation prevents
 * overlaps; if data were ever inconsistent, the tie-break is deterministic:
 * highest minQuantity (most specific), then lowest id.
 */
export function selectTier<T extends TierLike>(tiers: T[], quantity: number): T | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const matches = tiers.filter((t) => t.isActive && tierContains(t, quantity));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => b.minQuantity - a.minQuantity || (a.id < b.id ? -1 : 1))[0];
}

export function rangesOverlap(a: TierRange, b: TierRange): boolean {
  const aMax = a.maxQuantity ?? Number.POSITIVE_INFINITY;
  const bMax = b.maxQuantity ?? Number.POSITIVE_INFINITY;
  return a.minQuantity <= bMax && b.minQuantity <= aMax;
}

export interface TierValidationInput extends TierRange {
  id?: string;
  feeKobo: number;
  isActive: boolean;
}

/** Validates one tier on its own. Returns an error message or null. */
export function validateTierShape(t: TierValidationInput): string | null {
  if (!Number.isInteger(t.minQuantity) || t.minQuantity < 1) return 'Minimum quantity must be a whole number of at least 1';
  if (t.maxQuantity !== null) {
    if (!Number.isInteger(t.maxQuantity)) return 'Maximum quantity must be a whole number';
    if (t.maxQuantity < t.minQuantity) return 'Maximum quantity cannot be lower than the minimum';
  }
  if (!Number.isInteger(t.feeKobo) || t.feeKobo < 0) return 'Fee must be a non-negative amount';
  return null;
}

/** Checks `candidate` against the other active tiers. Returns an error message or null. */
export function findTierOverlap(
  candidate: TierValidationInput,
  existing: Array<TierRange & { id: string; isActive: boolean; label?: string | null }>,
): string | null {
  if (!candidate.isActive) return null;
  for (const other of existing) {
    if (!other.isActive || other.id === candidate.id) continue;
    if (rangesOverlap(candidate, other)) {
      const rng = other.maxQuantity === null ? `${other.minQuantity}+` : `${other.minQuantity}–${other.maxQuantity}`;
      return `Overlaps an existing active tier (${rng}${other.label ? `, "${other.label}"` : ''})`;
    }
  }
  return null;
}

/** Quantity ranges not covered by any active tier (informational warning for admins). */
export function findCoverageGaps(tiers: TierRange[]): Array<{ from: number; to: number | null }> {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const gaps: Array<{ from: number; to: number | null }> = [];
  let cursor = 1;
  for (const t of sorted) {
    if (t.minQuantity > cursor) gaps.push({ from: cursor, to: t.minQuantity - 1 });
    if (t.maxQuantity === null) return gaps;
    cursor = Math.max(cursor, t.maxQuantity + 1);
  }
  gaps.push({ from: cursor, to: null });
  return gaps;
}

export function describeRange(t: TierRange): string {
  return t.maxQuantity === null
    ? `${t.minQuantity.toLocaleString('en-NG')}+ codes`
    : `${t.minQuantity.toLocaleString('en-NG')} – ${t.maxQuantity.toLocaleString('en-NG')} codes`;
}
