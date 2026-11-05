import { describe, expect, it } from 'vitest';
import { computeCommission, pickEffectiveRule, resolveCommissionPure, windowsOverlap, type RuleLike } from '@/lib/commission/resolver';

const d = (s: string) => new Date(s);
const rule = (id: string, bps: number, o: Partial<RuleLike> = {}): RuleLike => ({
  id, percentageBps: bps, isActive: true, startsAt: null, endsAt: null, createdAt: d('2026-01-01T00:00:00Z'), ...o,
});
const base = { legacyOrganizerBps: null, generalBps: 1000, eventRules: [] as RuleLike[], organizerRules: [] as RuleLike[] };

describe('commission precedence', () => {
  const at = d('2026-11-20T12:00:00Z');
  it('applies the general commission when no rules exist', () => {
    expect(resolveCommissionPure({ ...base, at })).toEqual({ bps: 1000, source: 'GENERAL', ruleId: null });
  });
  it('organizer rule overrides general', () => {
    const r = resolveCommissionPure({ ...base, at, organizerRules: [rule('o1', 500)] });
    expect(r).toEqual({ bps: 500, source: 'ORGANIZER_RULE', ruleId: 'o1' });
  });
  it('event rule overrides organizer rule (and general)', () => {
    const r = resolveCommissionPure({ ...base, at, organizerRules: [rule('o1', 700)], eventRules: [rule('e1', 300)] });
    expect(r).toEqual({ bps: 300, source: 'EVENT_RULE', ruleId: 'e1' });
  });
  it('expired event rule falls back to the organizer rule, expired organizer rule falls back to general', () => {
    const expired = (id: string, bps: number) => rule(id, bps, { startsAt: d('2026-11-01T00:00:00Z'), endsAt: d('2026-11-10T00:00:00Z') });
    const r1 = resolveCommissionPure({ ...base, at, organizerRules: [rule('o1', 700)], eventRules: [expired('e1', 300)] });
    expect(r1.source).toBe('ORGANIZER_RULE');
    const r2 = resolveCommissionPure({ ...base, at, organizerRules: [expired('o1', 700)], eventRules: [expired('e1', 300)] });
    expect(r2).toEqual({ bps: 1000, source: 'GENERAL', ruleId: null });
  });
  it('a rule is effective on [start, end): start inclusive, end exclusive', () => {
    const o = rule('o', 500, { startsAt: d('2026-11-10T00:00:00Z'), endsAt: d('2026-12-31T00:00:00Z') });
    const at1 = (s: string) => resolveCommissionPure({ ...base, at: d(s), organizerRules: [o] }).source;
    expect(at1('2026-11-09T23:59:59Z')).toBe('GENERAL'); // before start
    expect(at1('2026-11-10T00:00:00Z')).toBe('ORGANIZER_RULE'); // start inclusive
    expect(at1('2026-12-30T23:59:59Z')).toBe('ORGANIZER_RULE');
    expect(at1('2026-12-31T00:00:00Z')).toBe('GENERAL'); // expired: never applies again
    expect(at1('2027-06-01T00:00:00Z')).toBe('GENERAL');
  });
  it('inactive rules never apply', () => {
    expect(pickEffectiveRule([rule('x', 100, { isActive: false })], at)).toBeNull();
  });
  it('zero-percent commission is honoured (not treated as unset)', () => {
    const r = resolveCommissionPure({ ...base, at, organizerRules: [rule('zero', 0)] });
    expect(r).toEqual({ bps: 0, source: 'ORGANIZER_RULE', ruleId: 'zero' });
    expect(computeCommission(1_000_000, r).commissionKobo).toBe(0);
    expect(computeCommission(1_000_000, r).proceedsKobo).toBe(1_000_000);
  });
  it('legacy per-organizer fee sits between organizer rules and the general commission', () => {
    expect(resolveCommissionPure({ ...base, at, legacyOrganizerBps: 800 })).toEqual({ bps: 800, source: 'ORGANIZER_LEGACY', ruleId: null });
    expect(resolveCommissionPure({ ...base, at, legacyOrganizerBps: 800, organizerRules: [rule('o', 500)] }).source).toBe('ORGANIZER_RULE');
  });
  it('tie-break between simultaneously effective rules is deterministic', () => {
    const a = rule('a', 100, { startsAt: d('2026-11-01T00:00:00Z') });
    const b = rule('b', 200, { startsAt: d('2026-11-15T00:00:00Z') });
    expect(pickEffectiveRule([a, b], at)?.id).toBe('b'); // later start wins
    expect(pickEffectiveRule([b, a], at)?.id).toBe('b'); // order-independent
  });
  it('changing the general commission cannot change what a rule yields', () => {
    const o = [rule('o', 500)];
    const r1 = resolveCommissionPure({ ...base, at, generalBps: 1000, organizerRules: o });
    const r2 = resolveCommissionPure({ ...base, at, generalBps: 200, organizerRules: o });
    expect(r1.bps).toBe(500);
    expect(r2.bps).toBe(500);
  });
});

describe('rule window overlap', () => {
  it('detects overlap, adjacency and open-ended windows', () => {
    const w = (a: string | null, b: string | null) => ({ startsAt: a ? d(a) : null, endsAt: b ? d(b) : null });
    expect(windowsOverlap(w('2026-11-01T00:00:00Z', '2026-11-10T00:00:00Z'), w('2026-11-05T00:00:00Z', '2026-11-20T00:00:00Z'))).toBe(true);
    expect(windowsOverlap(w('2026-11-01T00:00:00Z', '2026-11-10T00:00:00Z'), w('2026-11-10T00:00:00Z', '2026-11-20T00:00:00Z'))).toBe(false); // back-to-back is fine
    expect(windowsOverlap(w(null, null), w('2026-11-10T00:00:00Z', null))).toBe(true);
    expect(windowsOverlap(w('2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z'), w('2026-12-01T00:00:00Z', null))).toBe(false);
  });
});
