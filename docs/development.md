---
description: How to set up a workstation for Agendai, run the quality gate, understand the pre-commit hook and regenerate the documentation and diagrams.
---

# Development

The daily workflow comes down to three things: setup, the checks that run before each commit, and keeping the documentation in step with the code.

## Requirements

- Node.js 24, the same major version as the Docker image.
- Docker and Docker Compose, for the database.
- Google Chrome or Chromium, only when you regenerate the diagrams. See [Diagrams](#diagrams).

## Setup

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run start:dev -- --env-file .env
```

`npm install` runs the `prepare` script, which points Git at `.githooks/`. Run `npm run prepare` to activate the hooks in a clone where that did not happen.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run start:dev` | Runs the API with reload on change. |
| `npm run build` | Compiles `src/` into `dist/`. |
| `npm test` | Runs the unit and smoke tests with Vitest. |
| `npm run lint` | Runs ESLint, including the complexity, depth, parameter and security rules. |
| `npm run typecheck` | Runs the TypeScript compiler without emitting files. |
| `npm run complexity` | Checks the cyclomatic complexity of each function in `src/`. |
| `npm run comments` | Checks the comment budget. |
| `npm run docs` | Regenerates the reference pages and the diagrams. |
| `npm run docs:check` | Checks the Markdown pages against the AI-readiness and style rules. |
| `npm run gate` | Runs lint, typecheck, tests, complexity, comments and the docs check. |
| `npm run db:generate` | Generates a migration from the Drizzle schema. |
| `npm run db:migrate` | Applies pending migrations to `DATABASE_URL`. |

## Pre-commit hook

Before each commit, the hook in `.githooks/pre-commit` runs two steps:

1. `npm run docs` regenerates `docs/generated/` and `docs/diagrams/`.
2. `npm run gate` checks the code and the documentation. A failure blocks the commit.

When both pass, the hook stages `docs/generated/` and `docs/diagrams/`, so the documentation in the commit always matches the code in it. The hook can only stage whole directories, so changes to docs you did not intend to commit will be included.

If `node` is not on the `PATH`, the hook looks for one under nvm, Volta or fnm. To skip the hook once, use `git commit --no-verify`. Skipping it leaves the documentation out of date, so do that only when you know why.

## Documentation

Two kinds of documentation live in `docs/`:

- Hand-written pages such as this one. Edit them directly. Keep each page's description between 50 and 160 characters, give each heading a specific name, and make every table complete, using `None` for an empty cell.
- Generated pages under `docs/generated/`. Do not edit them. `scripts/docs/extract.mjs` reads the source, and `scripts/docs/render-markdown.mjs` writes the pages:
  - Endpoints come from the controllers and the access policy.
  - Environment variables come from the Zod schema in `src/shared/config/env.schema.ts`. Add a `.describe()` to a new variable so it appears in the reference.
  - Tables come from the Drizzle schema in `src/shared/database/schema.ts`, read through `getTableConfig`.

`scripts/docs/check.mjs` checks the Markdown pages with a subset of the AI-readiness checks: description length, heading names, empty sections, table completeness, opening pronouns, link text and common AI-writing phrases.

## Diagrams

Diagrams are built with Archify. The generator writes these candidate files to `docs/diagrams/src/`:

- `data-model.erd.json` from the Drizzle schema, and `module-map.tree.json` from the folders under `src/`. The generator rewrites both on every run.
- `system-architecture.architecture.json` and `create-unit-request.sequence.json`, which are written by hand. The generator renders them but does not change them.

Rendering needs two things on your machine:

- Archify: the generator looks for `bin/archify.mjs` under `ARCHIFY_HOME`, which defaults to `~/.agents/skills/archify`.
- A Chrome or Chromium binary: Archify uses it to verify each diagram in a browser. Set `ARCHIFY_CHROME` to its path when it is not on the `PATH`.

Without Archify, the generator still writes the candidate files and prints a warning, but it does not render the HTML and SVG files. Commit the candidates anyway, so the diagrams can be rendered later.

The receipts that Archify writes live in `docs/diagrams/.archify/`, which is ignored by Git.

## Adding a feature

1. Create `src/features/<name>/` with the controller, service, schemas and module. Follow the rules in [Architecture](architecture.md).
2. Import the module in `src/app.module.ts`.
3. Scope every tenant query by `tenantId`, and add a test for the behaviour you change.
4. Run `npm run docs`. The endpoint reference and the module map update on their own. Add a short paragraph to the hand-written page that covers the feature.
5. Run `npm run gate`, then commit.

## Tests

The current tests are unit tests and an HTTP smoke test that runs without a database. They do not yet exercise PostgreSQL. The continuous integration pipeline and the integration tests against a real database are still to be written.
