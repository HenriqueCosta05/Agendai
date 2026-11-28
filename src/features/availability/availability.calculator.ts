import { listDates, weekdayOf, zonedToInstant } from './calendar.js';

const MINUTE_MS = 60 * 1000;

export interface BookableService {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
}

/** A weekly working window of one professional, in the unit's local time. */
export interface WeeklyWindow {
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

/** An absolute period in which a professional cannot take a client: time off, or an active booking. */
export interface BusyPeriod {
  professionalId: string;
  start: Date;
  end: Date;
}

export interface AvailabilityInput {
  timeZone: string;
  /** First local date (YYYY-MM-DD), included. */
  from: string;
  /** Last local date (YYYY-MM-DD), included. */
  to: string;
  services: BookableService[];
  windows: WeeklyWindow[];
  busy: BusyPeriod[];
}

export interface AvailableSlot {
  professionalId: string;
  startsAt: Date;
  /** End of the service. The buffer that follows it is not included. */
  endsAt: Date;
}

export interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  durationMin: number;
  bufferMin: number;
  slots: AvailableSlot[];
}

// Slots sit on a grid anchored at each window start. A slot is the service plus its buffer, and must fit
// the window and avoid the professional's busy periods.
export const calculateAvailability = (input: AvailabilityInput): ServiceAvailability[] => {
  const dates = listDates(input.from, input.to);
  return input.services.map((service) => ({
    serviceId: service.id,
    serviceName: service.name,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    slots: dates.flatMap((date) => slotsOnDate(input, service, date)).sort(byStart),
  }));
};

const slotsOnDate = (input: AvailabilityInput, service: BookableService, date: string): AvailableSlot[] => {
  const weekday = weekdayOf(date);
  return input.windows
    .filter((window) => window.weekday === weekday)
    .flatMap((window) => slotsInWindow(input, service, date, window));
};

const slotsInWindow = (
  input: AvailabilityInput,
  service: BookableService,
  date: string,
  window: WeeklyWindow,
): AvailableSlot[] => {
  const windowStart = zonedToInstant(date, window.startTime, input.timeZone).getTime();
  const windowEnd = zonedToInstant(date, window.endTime, input.timeZone).getTime();
  const footprint = (service.durationMin + service.bufferMin) * MINUTE_MS;
  const serviceLength = service.durationMin * MINUTE_MS;
  const busy = input.busy.filter((period) => period.professionalId === window.professionalId);
  const slots: AvailableSlot[] = [];

  for (let start = windowStart; start + footprint <= windowEnd; start += footprint) {
    const end = start + footprint;
    if (!busy.some((period) => period.start.getTime() < end && start < period.end.getTime())) {
      slots.push({
        professionalId: window.professionalId,
        startsAt: new Date(start),
        endsAt: new Date(start + serviceLength),
      });
    }
  }
  return slots;
};

const byStart = (a: AvailableSlot, b: AvailableSlot) =>
  a.startsAt.getTime() - b.startsAt.getTime() || a.professionalId.localeCompare(b.professionalId);
