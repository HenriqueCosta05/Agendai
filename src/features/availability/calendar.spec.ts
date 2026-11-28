import { describe, expect, it } from 'vitest';
import { addDays, listDates, weekdayOf, zonedToInstant } from './calendar.js';

describe('zonedToInstant', () => {
  it('reads a wall-clock time in the zone of the unit', () => {
    expect(zonedToInstant('2026-03-02', '09:00', 'America/Sao_Paulo').toISOString()).toBe('2026-03-02T12:00:00.000Z');
  });

  it('applies the offset in force on the day, across a daylight saving change', () => {
    // New York starts DST at 02:00 on 2026-03-08, so 09:00 is UTC-4 that day and UTC-5 the day before.
    expect(zonedToInstant('2026-03-08', '09:00', 'America/New_York').toISOString()).toBe('2026-03-08T13:00:00.000Z');
    expect(zonedToInstant('2026-03-07', '09:00', 'America/New_York').toISOString()).toBe('2026-03-07T14:00:00.000Z');
  });
});

describe('calendar dates', () => {
  it('lists dates from one to another, both included', () => {
    expect(listDates('2026-02-28', '2026-03-01')).toEqual(['2026-02-28', '2026-03-01']);
  });

  it('moves across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('numbers weekdays from Sunday as 0, like schedules.weekday', () => {
    expect(weekdayOf('2026-03-01')).toBe(0);
    expect(weekdayOf('2026-03-02')).toBe(1);
  });
});
