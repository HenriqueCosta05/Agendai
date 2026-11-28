# Agendai

Multi-tenant scheduling API for clinics. Built with NestJS 12, PostgreSQL and Docker Compose, with Prometheus metrics.

Each clinic is a tenant. Every row carries a `tenant_id`, and every query is scoped to the tenant in the caller's access token.

## Status

Implemented:

- Auth with roles (`admin`, `professional`, `client`): sign-up, sign-in, refresh tokens, member creation
- CRUDs for units, services and professionals
- Prometheus metrics at `GET /metrics`
- Full data model, including bookings, class sessions, waitlist and outbox tables

Availability of individual services is implemented (`GET /units/:id/availability`). Not implemented yet: the booking, waitlist and outbox logic. Those tables exist in the schema (see [docs/architecture.md](docs/architecture.md)) but have no endpoints.

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
| `npm run gate` | lint, typecheck, tests, complexity, comment budget and the docs check |
| `npm run docs` | regenerate the reference pages and the Archify diagrams |
| `npm run docs:check` | check the Markdown pages for AI readability and common AI-writing tells |
| `npm run db:generate` | generate a migration from `src/shared/database/schema.ts` |
| `npm run db:migrate` | apply pending migrations |
| `npm run build` | compile to `dist/` |

## Pre-commit hook

`npm install` points Git at `.githooks/` (the `prepare` script sets `core.hooksPath`). Before every commit the hook regenerates the documentation with `npm run docs`, then runs `npm run gate`. A failure in either step blocks the commit. When both pass, the hook stages `docs/generated/` and `docs/diagrams/`. If `node` is not on the `PATH`, the hook looks for one under nvm, Volta or fnm. Rendering the diagrams needs Archify and a Chrome or Chromium binary, as described in [Development](docs/development.md#diagrams).

To activate it without reinstalling, run `npm run prepare`. To skip it once, use `git commit --no-verify`.

## Project layout

The code is organised by feature. See [docs/architecture.md](docs/architecture.md).

```text
src/
  features/   auth, users, units, services, professionals, metrics
  shared/     config and database
```

## Documentation

The full index is in [docs/README.md](docs/README.md). The main pages are:

- [Architecture](docs/architecture.md): containers, module layout, tenancy and roles
- [Data model](docs/data-model.md): what each table holds and the rules the database enforces
- [Authentication](docs/authentication.md): sign-in, access and refresh tokens
- [API](docs/api.md): conventions, errors and the first requests to try
- [Operations](docs/operations.md): Docker Compose, migrations and production settings
- [Observability](docs/observability.md): Prometheus metrics and NestJS Observe
- [Development](docs/development.md): setup, the gate and regenerating the docs

## License

UNLICENSED
