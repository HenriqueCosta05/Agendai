import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray, sql, type AnyColumn } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bookings, professionals, schedules, services, timeOff, units } from '../../shared/database/schema.js';
import { addDays, zonedToInstant } from './calendar.js';
import {
  calculateAvailability,
  type BusyPeriod,
  type ServiceAvailability,
  type WeeklyWindow,
} from './availability.calculator.js';
import type { AvailabilityQuery } from './availability.schemas.js';

interface Span {
  start: Date;
  end: Date;
}

// A booking blocks its professional while it is pending or confirmed, the same statuses the exclusion constraint uses.
const activeBookingStatuses = ['pending', 'confirmed'] as const;

const overlapping = (period: AnyColumn, span: Span) =>
  sql`${period} && tstzrange(${span.start}, ${span.end}, '[)')`;

// The driver returns timestamptz as text, such as "2026-03-02 13:15:00+00", so each bound is parsed here.
const toInstant = (value: unknown) => new Date(String(value));
const periodStart = (period: AnyColumn) => sql<Date>`lower(${period})`.mapWith(toInstant);
const periodEnd = (period: AnyColumn) => sql<Date>`upper(${period})`.mapWith(toInstant);

@Injectable()
export class AvailabilityService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async forUnit(tenantId: string, unitId: string, query: AvailabilityQuery): Promise<ServiceAvailability[]> {
    const unit = await this.findUnit(tenantId, unitId);
    const [serviceList, professionalIds] = await Promise.all([
      this.findIndividualServices(tenantId),
      this.findProfessionalIds(tenantId, unitId),
    ]);
    const { windows, busy } = await this.loadTimes(tenantId, professionalIds, query, unit.timezone);
    return calculateAvailability({
      timeZone: unit.timezone,
      from: query.from,
      to: query.to,
      services: serviceList,
      windows,
      busy,
    });
  }

  private async findUnit(tenantId: string, unitId: string) {
    const [unit] = await this.db
      .select({ timezone: units.timezone })
      .from(units)
      .where(and(eq(units.tenantId, tenantId), eq(units.id, unitId)));
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  // Group services (capacity above one) are sold through class sessions, not single slots.
  private findIndividualServices(tenantId: string) {
    return this.db
      .select({ id: services.id, name: services.name, durationMin: services.durationMin, bufferMin: services.bufferMin })
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.capacity, 1)))
      .orderBy(services.name);
  }

  private async findProfessionalIds(tenantId: string, unitId: string) {
    const rows = await this.db
      .select({ id: professionals.id })
      .from(professionals)
      .where(and(eq(professionals.tenantId, tenantId), eq(professionals.unitId, unitId)));
    return rows.map((row) => row.id);
  }

  private async loadTimes(tenantId: string, professionalIds: string[], query: AvailabilityQuery, timeZone: string) {
    if (professionalIds.length === 0) {
      return { windows: [] as WeeklyWindow[], busy: [] as BusyPeriod[] };
    }
    const span: Span = {
      start: zonedToInstant(query.from, '00:00', timeZone),
      end: zonedToInstant(addDays(query.to, 1), '00:00', timeZone),
    };
    const [windows, timeOffPeriods, bookingPeriods] = await Promise.all([
      this.findWindows(tenantId, professionalIds),
      this.findTimeOff(tenantId, professionalIds, span),
      this.findActiveBookings(tenantId, professionalIds, span),
    ]);
    return { windows, busy: [...timeOffPeriods, ...bookingPeriods] };
  }

  private findWindows(tenantId: string, professionalIds: string[]): Promise<WeeklyWindow[]> {
    return this.db
      .select({
        professionalId: schedules.professionalId,
        weekday: schedules.weekday,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
      })
      .from(schedules)
      .where(and(eq(schedules.tenantId, tenantId), inArray(schedules.professionalId, professionalIds)));
  }

  private findTimeOff(tenantId: string, professionalIds: string[], span: Span): Promise<BusyPeriod[]> {
    return this.db
      .select({
        professionalId: timeOff.professionalId,
        start: periodStart(timeOff.period),
        end: periodEnd(timeOff.period),
      })
      .from(timeOff)
      .where(
        and(
          eq(timeOff.tenantId, tenantId),
          inArray(timeOff.professionalId, professionalIds),
          overlapping(timeOff.period, span),
        ),
      );
  }

  // A booking's period must cover its service and buffer, because a booking does not record its service.
  private findActiveBookings(tenantId: string, professionalIds: string[], span: Span): Promise<BusyPeriod[]> {
    return this.db
      .select({
        professionalId: bookings.professionalId,
        start: periodStart(bookings.period),
        end: periodEnd(bookings.period),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          inArray(bookings.professionalId, professionalIds),
          inArray(bookings.status, [...activeBookingStatuses]),
          overlapping(bookings.period, span),
        ),
      );
  }
}
