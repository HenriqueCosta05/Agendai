---
description: Index of the Agendai documentation, with the pages written by hand, the generated reference pages and the diagrams.
---

# Agendai documentation

Agendai is a multi-tenant scheduling API for clinics. Each clinic is a tenant, and every request runs inside the tenant of the signed-in user. Read [Architecture](architecture.md) for the overall design, or [Development](development.md) to run the API on your machine.

## Pages written by hand

| Page | Read it to |
| --- | --- |
| [Architecture](architecture.md) | Understand the containers, the module layout, tenancy and roles. |
| [Data model](data-model.md) | Learn what each table holds and which rules the database enforces. |
| [Authentication](authentication.md) | Sign in, rotate refresh tokens and follow how a request is authorized. |
| [API](api.md) | Call the endpoints with examples, and read the error responses. |
| [Operations](operations.md) | Run the Docker Compose stack, apply migrations and configure the environment. |
| [Observability](observability.md) | Read the Prometheus metrics and connect the NestJS Observe telemetry. |
| [Development](development.md) | Set up a workstation, run the quality gate and regenerate these docs. |

## Generated reference

The pages below come from the source code. `npm run docs` rewrites them, so change the source instead.

| Page | Contents |
| --- | --- |
| [HTTP endpoints](generated/endpoints.md) | Every route with its method, access rule, success status and body schema. |
| [Environment variables](generated/configuration.md) | Every variable the API validates at startup, with defaults. |
| [Data model reference](generated/data-model.md) | Every table, column, key, foreign key, index and check constraint. |

## Diagrams

The diagrams are built with [Archify](https://github.com/tt-a1i/archify). Each one has an interactive HTML version under `docs/diagrams/`, and the SVG files embedded on these pages are exported from the same HTML.

| Diagram | Source |
| --- | --- |
| [System architecture](diagrams/system-architecture.html) | Written by hand in `docs/diagrams/src/`. |
| [Create a unit with an access token](diagrams/create-unit-request.html) | Written by hand in `docs/diagrams/src/`. |
| [Data model](diagrams/data-model.html) | Generated from `src/shared/database/schema.ts`. |
| [Module map](diagrams/module-map.html) | Generated from the folders under `src/`. |
