import { describe, expect, it } from 'vitest';
import { calculateAvailability, type AvailabilityInput, type BusyPeriod } from './availability.calculator.js';

const MONDAY = '2026-03-02';
const TIME_ZONE = 'America/Sao_Paulo';
const ANA = 'professional-ana';
const BEA = 'professional-bea';
const haircut = { id: 'service-haircut', name: 'Haircut', durationMin: 50, bufferMin: 10 };

// Sao Paulo is UTC-3 on this date, so local 09:00 is 12:00 UTC.
const at = (time: string) => new Date(`${MONDAY}T${time}:00-03:00`);

const busy = (professionalId: string, start: string, end: string): BusyPeriod => ({
  professionalId,
  start: at(start),
  end: at(end),
});

const input = (overrides: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  timeZone: TIME_ZONE,
  from: MONDAY,
  to: MONDAY,
  services: [haircut],
  windows: [{ professionalId: ANA, weekday: 1, startTime: '09:00:00', endTime: '12:00:00' }],
  busy: [],
  ...overrides,
});

const startsOf = (result: ReturnType<typeof calculateAvailability>, serviceId = haircut.id) =>
  result.find((service) => service.serviceId === serviceId)?.slots.map((slot) => slot.startsAt.toISOString());

describe('calculateAvailability', () => {
  it('offers 09:00, 10:00 and 11:00 for a 09:00-12:00 window with a 50 minute service and 10 minute buffer', () => {
    const [result] = calculateAvailability(input());

    expect(result?.slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      at('09:00').toISOString(),
      at('10:00').toISOString(),
      at('11:00').toISOString(),
    ]);
  });

  it('ends each slot when the service ends, leaving out the buffer', () => {
    const [result] = calculateAvailability(input());

    expect(result?.slots[0]?.endsAt).toEqual(at('09:50'));
  });

  it('drops a slot whose service and buffer do not both fit in the window', () => {
    // 11:00 + 60 minutes ends at 12:00, after the window closes at 11:30.
    const [result] = calculateAvailability(input({ windows: [{ professionalId: ANA, weekday: 1, startTime: '09:00:00', endTime: '11:30:00' }] }));

    expect(result?.slots.map((slot) => slot.startsAt)).toEqual([at('09:00'), at('10:00')]);
  });

});

describe('busy time', () => {
  it('removes the slots that overlap time off, and keeps back-to-back ones', () => {
    const result = calculateAvailability(input({ busy: [busy(ANA, '10:15', '10:30')] }));

    expect(startsOf(result)).toEqual([at('09:00').toISOString(), at('11:00').toISOString()]);
  });

  it('blocks a slot when a booking overlaps its buffer, not only its service', () => {
    // A booking from 09:30 to 10:10 (service plus buffer) overlaps the 09:00 slot and the 10:00 slot.
    const result = calculateAvailability(input({ busy: [busy(ANA, '09:30', '10:10')] }));

    expect(startsOf(result)).toEqual([at('11:00').toISOString()]);
  });

  it('does not let one professional busy time block another professional', () => {
    const result = calculateAvailability(
      input({
        windows: [
          { professionalId: ANA, weekday: 1, startTime: '09:00:00', endTime: '12:00:00' },
          { professionalId: BEA, weekday: 1, startTime: '09:00:00', endTime: '12:00:00' },
        ],
        busy: [busy(ANA, '09:00', '12:00')],
      }),
    );

    expect(result[0]?.slots.map((slot) => slot.professionalId)).toEqual([BEA, BEA, BEA]);
  });

});

describe('days and services', () => {
  it('offers nothing on a day without a working window for the professional', () => {
    const result = calculateAvailability(input({ from: '2026-03-03', to: '2026-03-03' }));

    expect(result[0]?.slots).toEqual([]);
  });

  it('walks every day of the range and keeps the slots in time order', () => {
    const result = calculateAvailability(
      input({
        from: MONDAY,
        to: '2026-03-03',
        windows: [
          { professionalId: BEA, weekday: 2, startTime: '14:00:00', endTime: '15:00:00' },
          { professionalId: ANA, weekday: 1, startTime: '09:00:00', endTime: '10:00:00' },
        ],
      }),
    );

    expect(result[0]?.slots.map((slot) => slot.startsAt)).toEqual([at('09:00'), new Date('2026-03-03T14:00:00-03:00')]);
  });

  it('computes each service with its own duration and buffer', () => {
    const short = { id: 'service-check', name: 'Check', durationMin: 20, bufferMin: 0 };
    const result = calculateAvailability(input({ services: [haircut, short] }));

    // 180 minutes of window divided by 20-minute slots with no buffer.
    expect(startsOf(result, short.id)?.length).toBe(9);
    expect(startsOf(result)?.length).toBe(3);
  });
});
