import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const at = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const tstzrange = customType<{ data: string; driverData: string }>({
  dataType: () => 'tstzrange',
});

export const userRole = pgEnum('user_role', ['admin', 'professional', 'client']);
export const bookingStatus = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);
export const outboxStatus = pgEnum('outbox_status', ['pending', 'processed', 'failed']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: at('created_at').notNull().defaultNow(),
});

const tenantId = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('client'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [index('users_tenant_id_idx').on(table.tenantId), unique('users_id_tenant_uq').on(table.id, table.tenantId)],
);

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [index('units_tenant_id_idx').on(table.tenantId), unique('units_id_tenant_uq').on(table.id, table.tenantId)],
);

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text('name').notNull(),
    durationMin: integer('duration_min').notNull(),
    bufferMin: integer('buffer_min').notNull().default(0),
    capacity: integer('capacity').notNull().default(1),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('services_tenant_id_idx').on(table.tenantId),
    unique('services_id_tenant_uq').on(table.id, table.tenantId),
    check('services_duration_positive', sql`${table.durationMin} > 0`),
    check('services_buffer_non_negative', sql`${table.bufferMin} >= 0`),
    check('services_capacity_positive', sql`${table.capacity} >= 1`),
  ],
);

export const professionals = pgTable(
  'professionals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('professionals_tenant_id_idx').on(table.tenantId),
    index('professionals_unit_id_idx').on(table.unitId),
    unique('professionals_id_tenant_uq').on(table.id, table.tenantId),
  ],
);

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => professionals.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (table) => [
    index('schedules_professional_id_idx').on(table.professionalId),
    check('schedules_weekday_range', sql`${table.weekday} BETWEEN 0 AND 6`),
    check('schedules_time_order', sql`${table.startTime} < ${table.endTime}`),
  ],
);

export const timeOff = pgTable(
  'time_off',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => professionals.id, { onDelete: 'cascade' }),
    period: tstzrange('period').notNull(),
  },
  (table) => [index('time_off_professional_id_idx').on(table.professionalId)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => professionals.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    period: tstzrange('period').notNull(),
    status: bookingStatus('status').notNull().default('pending'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('bookings_tenant_idempotency_uq').on(table.tenantId, table.idempotencyKey),
    index('bookings_professional_id_idx').on(table.professionalId),
    index('bookings_client_id_idx').on(table.clientId),
  ],
);

export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    period: tstzrange('period').notNull(),
    capacity: integer('capacity').notNull(),
  },
  (table) => [
    index('class_sessions_tenant_id_idx').on(table.tenantId),
    check('class_sessions_capacity_positive', sql`${table.capacity} >= 1`),
  ],
);

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    offeredAt: at('offered_at'),
    expiresAt: at('expires_at'),
  },
  (table) => [
    unique('waitlist_session_client_uq').on(table.sessionId, table.clientId),
    unique('waitlist_session_position_uq').on(table.sessionId, table.position),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: tenantId(),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: outboxStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (table) => [index('outbox_events_status_idx').on(table.status, table.createdAt)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id').notNull(),
    userId: text('user_id').notNull(),
    createdAt: at('created_at').notNull(),
    expiresAt: at('expires_at').notNull(),
    familyExpiresAt: at('family_expires_at').notNull(),
    usedAt: at('used_at'),
    revoked: boolean('revoked').notNull().default(false),
    claims: jsonb('claims').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_expires_at_idx').on(table.familyExpiresAt),
  ],
);
