import { describe, expect, it } from 'vitest';
import { applyBps, nairaToKobo, percentToBps, bpsToPercent, isValidBps } from '@/lib/money';
import { findCoverageGaps, findTierOverlap, selectTier, validateTierShape } from '@/lib/ticket-generation/pricing';

describe('money (integer kobo / basis points)', () => {
  it('computes 10% of ₦100,000 exactly', () => {
    expect(applyBps(nairaToKobo(100_000), 1000)).toBe(nairaToKobo(10_000));
  });
  it('rounds half-up with integer arithmetic (no float drift)', () => {
    expect(applyBps(1, 5000)).toBe(1); // 0.5 -> 1
    expect(applyBps(3, 1000)).toBe(0); // 0.3 -> 0
    expect(applyBps(999_999, 700)).toBe(70_000); // 69,999.93 -> 70,000
    // classic float trap: 0.07 * 1000 etc. must be exact
    expect(applyBps(10_000, 700)).toBe(700);
  });
  it('supports zero percent and 100 percent', () => {
    expect(applyBps(123_456, 0)).toBe(0);
    expect(applyBps(123_456, 10_000)).toBe(123_456);
  });
  it('converts percent <-> bps and validates range', () => {
    expect(percentToBps(7.5)).toBe(750);
    expect(bpsToPercent(750)).toBe(7.5);
    expect(isValidBps(-1)).toBe(false);
    expect(isValidBps(10_001)).toBe(false);
    expect(isValidBps(10.5)).toBe(false);
    expect(() => applyBps(100, 10_001)).toThrow();
    expect(() => applyBps(-1, 100)).toThrow();
  });
});

describe('physical ticket pricing tiers', () => {
  const t = (id: string, min: number, max: number | null, feeKobo: number, isActive = true) => ({ id, label: id, minQuantity: min, maxQuantity: max, feeKobo, isActive });
  const defaults = [
    t('a', 1, 999, 0),
    t('b', 1000, 1999, 500_000),
    t('c', 2000, 4999, 1_000_000),
    t('d', 5000, 9999, 2_000_000),
    t('e', 10000, 19999, 3_500_000),
    t('f', 20000, null, 5_000_000),
  ];
  it.each([
    [1, 'a'], [999, 'a'], [1000, 'b'], [1999, 'b'], [2000, 'c'], [4999, 'c'],
    [5000, 'd'], [9999, 'd'], [10000, 'e'], [19999, 'e'], [20000, 'f'], [250000, 'f'],
  ])('quantity %i -> tier %s', (q, id) => {
    expect(selectTier(defaults, q)?.id).toBe(id);
  });
  it('returns null for invalid quantities and inactive tiers', () => {
    expect(selectTier(defaults, 0)).toBeNull();
    expect(selectTier(defaults, 1.5)).toBeNull();
    expect(selectTier([t('x', 1, 10, 0, false)], 5)).toBeNull();
  });
  it('rejects overlapping ranges but allows adjacent ones and inactive overlaps', () => {
    expect(findTierOverlap({ minQuantity: 900, maxQuantity: 1100, feeKobo: 1, isActive: true }, defaults)).toMatch(/Overlaps/);
    expect(findTierOverlap({ minQuantity: 20000, maxQuantity: null, feeKobo: 1, isActive: true, id: 'f' }, defaults)).toBeNull(); // editing itself
    expect(findTierOverlap({ minQuantity: 30000, maxQuantity: null, feeKobo: 1, isActive: true }, defaults)).toMatch(/Overlaps/);
    expect(findTierOverlap({ minQuantity: 900, maxQuantity: 1100, feeKobo: 1, isActive: false }, defaults)).toBeNull();
  });
  it('validates tier shape', () => {
    expect(validateTierShape({ minQuantity: 0, maxQuantity: 5, feeKobo: 0, isActive: true })).toMatch(/at least 1/);
    expect(validateTierShape({ minQuantity: 10, maxQuantity: 5, feeKobo: 0, isActive: true })).toMatch(/lower/);
    expect(validateTierShape({ minQuantity: 1, maxQuantity: null, feeKobo: -5, isActive: true })).toMatch(/Fee/);
    expect(validateTierShape({ minQuantity: 1, maxQuantity: null, feeKobo: 0, isActive: true })).toBeNull();
  });
  it('reports coverage gaps', () => {
    expect(findCoverageGaps(defaults)).toEqual([]);
    expect(findCoverageGaps([t('a', 1, 10, 0), t('b', 20, 30, 0)])).toEqual([{ from: 11, to: 19 }, { from: 31, to: null }]);
  });
});
