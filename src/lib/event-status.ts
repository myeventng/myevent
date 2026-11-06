// Single source of truth for "has this event ended?". Every path that ISSUES a
// new ticket or invitation (physical generation, invitation create/send) calls
// this so the rule cannot drift between them.
//
// Deliberately NOT applied to: completing a payment that was already taken,
// re-sending or re-downloading tickets that were already issued, refunds.

export const EVENT_ENDED_MESSAGE =
  'This event has already ended, so new tickets can no longer be generated or issued for it.';

export type EventTimes = { startDateTime: Date | string; endDateTime?: Date | string | null };

/** The moment the event is over: its end time, or its start time if the end is missing / earlier. */
export function eventEndInstant(e: EventTimes): Date {
  const start = new Date(e.startDateTime);
  const end = e.endDateTime ? new Date(e.endDateTime) : start;
  return end.getTime() < start.getTime() ? start : end;
}

export function hasEventEnded(e: EventTimes, now: Date = new Date()): boolean {
  return now.getTime() > eventEndInstant(e).getTime();
}
