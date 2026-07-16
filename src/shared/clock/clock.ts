/**
 * clock.ts — time source port (out). All date/time reads go through this so the system stays
 * consistent and UTC-absolute. The interface and its DI token live together by design.
 */
export const CLOCK = Symbol('Clock');

export interface Clock {
  now(): string; // current instant as an ISO-8601 UTC string
  nowMillis(): number; // current instant as epoch milliseconds
}
