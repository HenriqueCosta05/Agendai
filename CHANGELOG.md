# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Project foundation: NestJS 12, PostgreSQL 17 and Docker Compose.
- Multi-tenant data model: tenants, users, units, services, professionals, schedules, time off, bookings, class sessions, waitlist entries and outbox events.
- `tenant_id` on `schedules`, `time_off` and `waitlist_entries`, so every business table is tenant-scoped. The migration backfills existing rows from their parent.
- Booking constraints in SQL: a professional cannot hold two overlapping active bookings, and ranges cannot be empty.
- Authentication with JWT access tokens and rotating refresh tokens stored in PostgreSQL.
- Role-based authorization (`admin`, `professional`, `client`): everyone signed in can read, only admins can write.
- `POST /auth/sign-up` creates a tenant and its first admin. `POST /members` lets an admin add users.
- CRUD endpoints for units, services and professionals, scoped to the caller's tenant.
- Prometheus metrics at `GET /metrics`: HTTP request count and duration by method, route and status, plus Node.js process metrics.
- Prometheus service in Docker Compose, scraping the API every 15 seconds.
- NestJS Observe SDK (`@nestjs/observe`) registered in `AppModule` and passed to `NestFactory.create`. Keys come from `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET`.
- Drizzle migrations, run by a one-shot `migrate` service in Compose.
- Git pre-commit hook (`.githooks/pre-commit`) that regenerates the documentation, runs the quality gate and stages the generated docs, installed by `npm install`.
- Documentation set in `docs/`: architecture, data model, authentication, API, operations, observability and development guides, plus generated endpoint, configuration and data-model references.
- Archify diagrams in `docs/diagrams/`: system architecture, create-unit request, data model and module map, rendered to HTML and SVG by `npm run docs`.
- `scripts/docs/check.mjs` (`npm run docs:check`), part of the gate, checks the Markdown pages for AI readability and common AI-writing tells.
