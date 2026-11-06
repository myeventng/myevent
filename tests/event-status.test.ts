import { describe, expect, it } from 'vitest';
import { eventEndInstant, hasEventEnded } from '@/lib/event-status';

const t = (iso: string) => new Date(iso);

describe('event ended rule', () => {
  const ev = { startDateTime: t('2026-11-10T18:00:00Z'), endDateTime: t('2026-11-10T23:00:00Z') };

  it('is false before and during the event, true only after the end time', () => {
    expect(hasEventEnded(ev, t('2026-11-10T17:00:00Z'))).toBe(false);
    expect(hasEventEnded(ev, t('2026-11-10T20:00:00Z'))).toBe(false);
    expect(hasEventEnded(ev, t('2026-11-10T23:00:00Z'))).toBe(false); // exactly at the end
    expect(hasEventEnded(ev, t('2026-11-10T23:00:01Z'))).toBe(true);
  });

  it('falls back to the start time when the end is missing or earlier than the start', () => {
    expect(eventEndInstant({ startDateTime: ev.startDateTime, endDateTime: null })).toEqual(ev.startDateTime);
    expect(eventEndInstant({ startDateTime: ev.startDateTime, endDateTime: t('2026-11-10T10:00:00Z') })).toEqual(ev.startDateTime);
    expect(hasEventEnded({ startDateTime: ev.startDateTime }, t('2026-11-10T18:00:01Z'))).toBe(true);
  });

  it('accepts ISO strings', () => {
    expect(hasEventEnded({ startDateTime: '2020-01-01T00:00:00Z', endDateTime: '2020-01-01T02:00:00Z' })).toBe(true);
  });
});
