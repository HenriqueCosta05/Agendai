const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

const wallClockFormatter = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const partOf = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  Number(parts.find((part) => part.type === type)?.value);

// Milliseconds by which the zone's wall clock is ahead of UTC at this instant.
const zoneOffsetAt = (instant: number, timeZone: string): number => {
  const parts = wallClockFormatter(timeZone).formatToParts(new Date(instant));
  const wallClock = Date.UTC(
    partOf(parts, 'year'),
    partOf(parts, 'month') - 1,
    partOf(parts, 'day'),
    partOf(parts, 'hour'),
    partOf(parts, 'minute'),
    partOf(parts, 'second'),
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
};

/** The instant at which a time zone's wall clock reads `date` (YYYY-MM-DD) and `time` (HH:MM or HH:MM:SS). */
export const zonedToInstant = (date: string, time: string, timeZone: string): Date => {
  const wallClock = Date.parse(`${date}T${time}Z`);
  const firstGuess = wallClock - zoneOffsetAt(wallClock, timeZone);
  // The offset can differ at the guessed instant (DST), so it is read again there.
  return new Date(wallClock - zoneOffsetAt(firstGuess, timeZone));
};

export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

/** Every calendar date from `from` to `to`, both included. */
export const listDates = (from: string, to: string): string[] => {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
};

/** 0 for Sunday to 6 for Saturday, the same numbering as `schedules.weekday`. */
export const weekdayOf = (date: string): number => new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay();
