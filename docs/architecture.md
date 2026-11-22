# Architecture

## Feature-driven layout

Each business capability lives in its own folder under `src/features/` with its controller, service, schemas and module. Code used by several features goes in `src/shared/`.

```text
src/
  main.ts                 bootstrap
  app.module.ts           wires config, database, auth and the features
  features/
    auth/                 sign-up, sign-in, tokens, member creation, access policy
    users/                user type, repository, GET /me
    units/                units CRUD
    services/             services CRUD
    professionals/        professionals CRUD
    metrics/              Prometheus registry, middleware and /metrics
  shared/
    config/               environment schema (Zod)
    database/             Drizzle schema and PostgreSQL error helpers
```

Rules:

- A feature imports another feature only through its module or its exported classes, never its internals.
- `users` and `auth` depend on each other's files in one direction only: `auth` imports `users`, and `users` imports only the `AccessPolicy` class from `auth`.
- The database schema stays in one file because Drizzle needs a single schema to generate migrations.

## Multi-tenancy

Shared database, shared schema. Every tenant-owned table has a `tenant_id` column. The access token resolves to a user, and that user's `tenantId` scopes every query in the services. A request can never name a tenant itself.

Cross-references are checked in the service layer. For example, creating a professional verifies that the unit and the user both belong to the caller's tenant.

## Roles and authorization

| Role | Read units, services, professionals | Create, update, delete them | Create members |
| --- | --- | --- | --- |
| `admin` | yes | yes | yes |
| `professional` | yes | no | no |
| `client` | yes | no | no |

The rules live in `AccessPolicy` (`features/auth/access.policy.ts`) and are applied with `@Can()` on each route. A route without `@Can()` or `@Public()` is denied by default.

## Data model

| Table | Key fields |
| --- | --- |
| `tenants` | id, name |
| `users` | tenant_id, name, email, role |
| `units` | tenant_id, name, timezone |
| `services` | tenant_id, duration_min, buffer_min, capacity (1 = individual) |
| `professionals` | tenant_id, user_id, unit_id |
| `schedules` | professional_id, weekday, start_time, end_time (local time) |
| `time_off` | professional_id, period (`tstzrange`) |
| `bookings` | tenant_id, professional_id, client_id, period (`tstzrange`), status, idempotency_key |
| `class_sessions` | tenant_id, service_id, period, capacity |
| `waitlist_entries` | session_id, client_id, position, offered_at, expires_at |
| `outbox_events` | tenant_id, type, payload, status, attempts |
| `refresh_tokens` | state of the refresh tokens kept by `@nestjs/authentication` |

Notes:

- Times in `schedules` are local to the unit's `timezone`. Periods in `time_off`, `bookings` and `class_sessions` are absolute (`tstzrange`).
- `bookings_no_overlap` is an exclusion constraint: the database rejects two `pending` or `confirmed` bookings that overlap for the same professional, even under concurrent requests.
- `(tenant_id, idempotency_key)` is unique on `bookings`, so a retried request cannot create a second booking.
- Deleting a unit or a professional that is still referenced returns `409 Conflict`.

## Migrations

Drizzle Kit generates SQL from `src/shared/database/schema.ts` into `drizzle/`. Constraints that Drizzle cannot express, such as the exclusion constraint, are in a hand-written migration (`booking_constraints`).

```bash
npm run db:generate -- --name=<change>
npm run db:migrate
```
