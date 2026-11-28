import { z } from 'zod';
import { daysBetween } from './calendar.js';

const MAX_RANGE_DAYS = 31;

const isCalendarDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const calendarDate = z.string().refine(isCalendarDate, 'Expected a calendar date as YYYY-MM-DD');

export const availabilityQuerySchema = z
  .object({ from: calendarDate, to: calendarDate })
  .refine((query) => query.from <= query.to, { message: '"to" must not be before "from"', path: ['to'] })
  .refine((query) => daysBetween(query.from, query.to) < MAX_RANGE_DAYS, {
    message: `The range can cover at most ${MAX_RANGE_DAYS} days`,
    path: ['to'],
  });
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
