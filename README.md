# Agendai

Multi-tenant scheduling API for clinics. Built with NestJS 12, PostgreSQL and Docker Compose, with Prometheus metrics.

Each clinic is a tenant. Every row carries a `tenant_id`, and every query is scoped to the tenant in the caller's access token.

## Status

Implemented:

- Auth with roles (`admin`, `professional`, `client`): sign-up, sign-in, refresh tokens, member creation
- CRUDs for units, services and professionals
- Prometheus metrics at `GET /metrics`
- Full data model, including bookings, class sessions, waitlist and outbox tables

Not implemented yet: the booking, availability, waitlist and outbox logic. Those tables exist in the schema (see [docs/architecture.md](docs/architecture.md)) but have no endpoints.

## Quick start (Docker Compose)

```bash
cp .env.example .env
# set JWT_SECRET (openssl rand -base64 32) and change the database password in all three places
docker compose up --build
```

| Service | URL |
| --- | --- |
| API | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| PostgreSQL | 127.0.0.1:5432 |

Compose runs the migrations in a one-shot `migrate` service before the API starts.

## Local development

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run start:dev -- --env-file .env
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run gate` | lint, typecheck, tests, complexity and comment budget |
| `npm run db:generate` | generate a migration from `src/shared/database/schema.ts` |
| `npm run db:migrate` | apply pending migrations |
| `npm run build` | compile to `dist/` |

## Pre-commit hook

`npm install` points Git at `.githooks/` (the `prepare` script sets `core.hooksPath`). Before every commit the hook runs `npm run gate`, and a failure blocks the commit. If `node` is not on the `PATH`, the hook looks for one under nvm, Volta or fnm.

To activate it without reinstalling, run `npm run prepare`. To skip it once, use `git commit --no-verify`.

## Project layout

The code is organised by feature. See [docs/architecture.md](docs/architecture.md).

```text
src/
  features/   auth, users, units, services, professionals, metrics
  shared/     config and database
```

## Documentation

- [Architecture](docs/architecture.md): layout, tenancy, roles, data model
- [API](docs/api.md): endpoints and the first requests to try
- [Observability](docs/observability.md): Prometheus metrics and scraping

## License

UNLICENSED
