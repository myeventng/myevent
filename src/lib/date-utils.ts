import { format } from 'date-fns';

/** True only for a real, valid Date object. */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/** Convert Date | string | number | null | undefined into a valid Date or undefined. */
export function toValidDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const d = value instanceof Date ? value : new Date(value as any);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Never throws. Returns fallback when the date is missing or invalid. */
export function safeFormat(
  value: unknown,
  pattern: string,
  fallback = ''
): string {
  const d = toValidDate(value);
  return d ? format(d, pattern) : fallback;
}

/**
 * Apply an "HH:mm" string (from <input type="time">) to a date.
 * Returns undefined when the input is empty/partial (browser gives "" while the
 * user is typing or clears a segment), so callers can ignore that keystroke.
 */
export function applyTimeString(
  base: Date | undefined,
  time: string
): Date | undefined {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return undefined;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  const d = new Date(isValidDate(base) ? base.getTime() : Date.now());
  d.setHours(h, m, 0, 0);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Local "yyyy-MM-ddTHH:mm" for <input type="datetime-local"> (no UTC shift, never throws). */
export function toDateTimeLocalValue(value: unknown): string {
  return safeFormat(value, "yyyy-MM-dd'T'HH:mm");
}
