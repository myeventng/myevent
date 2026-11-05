// Pure commission resolution logic (no database access) so it can be unit
// tested exhaustively. The DB-backed wrapper lives in commission-service.ts.

import type { CommissionSource } from '@/generated/prisma';
import { applyBps } from '@/lib/money';

export interface RuleLike {
  id: string;
  isActive: boolean;
  percentageBps: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

export interface ResolvedCommission {
  bps: number;
  source: CommissionSource;
  ruleId: string | null;
}

/** A rule applies at `at` iff active, started (or no start) and not yet expired. [start, end) */
export function isRuleEffective(rule: RuleLike, at: Date): boolean {
  if (!rule.isActive) return false;
  const t = at.getTime();
  if (rule.startsAt && rule.startsAt.getTime() > t) return false;
  if (rule.endsAt && rule.endsAt.getTime() <= t) return false; // expired — never applies again
  return true;
}

/**
 * Deterministic tie-break when more than one effective rule exists in the same
 * tier (overlap prevention makes this rare, but concurrent writes or imported
 * data could produce it): latest start wins, then newest creation, then id.
 */
export function compareRulePriority(a: RuleLike, b: RuleLike): number {
  const aStart = (a.startsAt ?? a.createdAt).getTime();
  const bStart = (b.startsAt ?? b.createdAt).getTime();
  if (aStart !== bStart) return bStart - aStart;
  const aCreated = a.createdAt.getTime();
  const bCreated = b.createdAt.getTime();
  if (aCreated !== bCreated) return bCreated - aCreated;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function pickEffectiveRule<T extends RuleLike>(rules: T[], at: Date): T | null {
  const effective = rules.filter((r) => isRuleEffective(r, at));
  if (effective.length === 0) return null;
  return [...effective].sort(compareRulePriority)[0];
}

export interface ResolveInput {
  at: Date;
  eventRules: RuleLike[];
  organizerRules: RuleLike[];
  /** Pre-rules per-organizer override (OrganizerProfile.customPlatformFee), as bps. */
  legacyOrganizerBps: number | null;
  generalBps: number;
}

/**
 * Precedence:
 *   1. active event-specific rule
 *   2. active organizer-specific rule
 *   3. legacy organizer custom fee (backwards compatibility)
 *   4. general platform commission
 */
export function resolveCommissionPure(input: ResolveInput): ResolvedCommission {
  const eventRule = pickEffectiveRule(input.eventRules, input.at);
  if (eventRule) {
    return { bps: eventRule.percentageBps, source: 'EVENT_RULE', ruleId: eventRule.id };
  }
  const organizerRule = pickEffectiveRule(input.organizerRules, input.at);
  if (organizerRule) {
    return { bps: organizerRule.percentageBps, source: 'ORGANIZER_RULE', ruleId: organizerRule.id };
  }
  if (input.legacyOrganizerBps !== null && input.legacyOrganizerBps !== undefined) {
    return { bps: input.legacyOrganizerBps, source: 'ORGANIZER_LEGACY', ruleId: null };
  }
  return { bps: input.generalBps, source: 'GENERAL', ruleId: null };
}

export interface CommissionBreakdown extends ResolvedCommission {
  amountKobo: number;
  commissionKobo: number;
  proceedsKobo: number;
}

export function computeCommission(amountKobo: number, resolved: ResolvedCommission): CommissionBreakdown {
  const commissionKobo = applyBps(amountKobo, resolved.bps);
  return {
    ...resolved,
    amountKobo,
    commissionKobo,
    proceedsKobo: amountKobo - commissionKobo,
  };
}

// ─── Overlap detection (used when creating / editing rules) ─────────────────

export interface WindowLike {
  startsAt: Date | null;
  endsAt: Date | null;
}

const NEG_INF = Number.NEGATIVE_INFINITY;
const POS_INF = Number.POSITIVE_INFINITY;

/** Half-open [start, end) interval overlap; null start = -∞, null end = +∞. */
export function windowsOverlap(a: WindowLike, b: WindowLike): boolean {
  const aStart = a.startsAt ? a.startsAt.getTime() : NEG_INF;
  const aEnd = a.endsAt ? a.endsAt.getTime() : POS_INF;
  const bStart = b.startsAt ? b.startsAt.getTime() : NEG_INF;
  const bEnd = b.endsAt ? b.endsAt.getTime() : POS_INF;
  return aStart < bEnd && bStart < aEnd;
}
