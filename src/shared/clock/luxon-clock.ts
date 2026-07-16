/**
 * luxon-clock.ts — Luxon-backed Clock. Produces UTC-absolute instants for the whole system.
 */
import { DateTime } from 'luxon';
import type { Clock } from './clock';

export class LuxonClock implements Clock {
  now(): string {
    // toISO() is typed string | null; the ?? keeps the return type a string.
    return DateTime.utc().toISO() ?? new Date().toISOString();
  }

  nowMillis(): number {
    return DateTime.utc().toMillis();
  }
}
