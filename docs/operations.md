---
description: How to run the Agendai stack with Docker Compose, apply and write database migrations, configure the environment and expose the services safely.
---

# Operations

Use this page to run Agendai in containers, change the database schema, and set the options that matter outside a laptop. The variables themselves are listed in the [generated configuration reference](generated/configuration.md).

## Services

Docker Compose defines four services. The `migrate` service and the `api` service build from the same `Dockerfile`, using different stages.

| Service | Image or build | Purpose | Published port |
| --- | --- | --- | --- |
| `db` | `postgres:17.12-alpine` | PostgreSQL with the `pgdata` volume. | `127.0.0.1:5432` |
| `migrate` | `Dockerfile`, target `migrate` | Runs `drizzle-kit migrate` once, then exits. | None |
| `api` | `Dockerfile`, target `runtime` | The NestJS API on port 3000. | `3000:3000`, all interfaces |
| `prometheus` | `prom/prometheus:v3.7.0` | Scrapes `api:3000/metrics` every 15 seconds and evaluates `prometheus/alerts.yml`. | `127.0.0.1:9090` |

The `api` service starts only after `migrate` succeeds, and `migrate` starts only after `db` reports healthy.

## Starting the stack

```bash
cp .env.example .env
# Set JWT_SECRET (openssl rand -base64 32) and replace the database password in all three places.
docker compose up --build
```

Compose reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DOCKER_DATABASE_URL` and `JWT_SECRET` from `.env`, and stops with an error when one of them is missing. Use `docker compose down` to stop the stack. Add `-v` to delete the database and Prometheus volumes as well.

The database password is set only when the `pgdata` volume is first created. Changing `POSTGRES_PASSWORD` or `DOCKER_DATABASE_URL` later does not change the stored password, so the `migrate` service fails with `password authentication failed`. Either restore the old password, or run `docker compose down -v` to delete the data and start again. See [Observability](observability.md#troubleshooting) for the Prometheus side.

## The image

The `Dockerfile` is a multi-stage build on `node:24.22.3-alpine`:

- The `build` stage installs every dependency and compiles `src/` into `dist/`.
- The `prod-deps` stage installs only production dependencies.
- The `migrate` stage keeps the migration files and `drizzle-kit`, so it can run the migrations.
- The `runtime` stage contains the production dependencies and `dist/`, sets `NODE_ENV=production`, and runs as the `node` user.

## Migrations

Schema changes go through migrations, never through manual SQL on a running database.

```bash
npm run db:generate -- --name=<change>   # diff src/shared/database/schema.ts against the last snapshot
npm run db:migrate                        # apply pending migrations to DATABASE_URL
```

Drizzle writes each migration to `drizzle/<timestamp>_<name>/`, with the SQL and a snapshot of the schema after it.

Two rules keep the history safe:

- Never edit a migration that has been applied to any database. Write a new migration instead.
- Drizzle generates `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a backfill. If the table can hold rows, edit the generated file so it adds the column as nullable, fills it, and then sets `NOT NULL`. The `tenant_id_on_child_tables` migration shows that pattern.

Some constraints cannot be written in the Drizzle schema. The `booking_constraints` migration is hand-written and creates the booking exclusion constraint. `drizzle-kit generate` does not know about it, so keep it when you regenerate the snapshot.

## Local development with a database container

Run only the database in Compose, and run the API on the host:

```bash
docker compose up -d db
npm run db:migrate
npm run start:dev -- --env-file .env
```

The host uses `DATABASE_URL` (pointing at `localhost`), and the containers use `DOCKER_DATABASE_URL` (pointing at the `db` service). See [Development](development.md) for the rest of the workflow.

## Exposure

The stack binds the database and Prometheus to `127.0.0.1`, so only the host can reach them. The API is different: `3000:3000` listens on every interface of the host. Anyone who can reach the machine can call the API, and `GET /metrics` is public.

For a shared machine or a server, change the API port to `127.0.0.1:3000:3000` and put a reverse proxy with TLS in front of it. Keep `/metrics` on the internal network, or block that path at the proxy.

## Telemetry in the container

The `api` service passes only the variables listed in `docker-compose.yml`. It does not pass `OBSERVE_APP_KEY` or `OBSERVE_APP_SECRET`, so the containerized API sends no telemetry even when `.env` holds the keys. To enable it, add both variables under `environment` for the `api` service, or set them in the platform that runs the image. Give each environment its own key pair.

## Production checklist

- `JWT_SECRET` comes from a secret store, not from a file in the repository. It must be at least 32 characters.
- `DATABASE_URL` uses a role that can read and write the Agendai schema, and not a superuser.
- Each environment has its own Observe key pair, set through the environment.
- The API sits behind TLS, and `/metrics` is reachable only from the metrics scraper.
- Migrations run before the new API version starts, as the `migrate` service does in Compose.
