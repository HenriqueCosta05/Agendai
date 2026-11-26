---
name: prompt-gate
description: Mandatory first step for every user prompt in this project (Node.js/NestJS, PostgreSQL, Docker). Clarifies what the prompt expects and checks that no credentials or sensitive data are present or about to be written.
---

# Prompt Gate

Run this before any other work on a prompt. Do not skip it, even for small requests.

## Step 1: Understand the expectation

Write down, in your own head or in one short message, only if something is unclear:

- **Goal**: the outcome the user wants, in one sentence.
- **Scope**: which layer is touched (Nest module/controller/service, PostgreSQL schema or migration, Dockerfile/compose, tooling).
- **Done when**: how it can be verified (a test, endpoint response, passing gate).
- **Unknowns**: anything that changes the design. If two or more reasonable interpretations exist, ask one concise question before acting. Otherwise pick the conventional default and state it.

## Step 2: Sensitive-data check (prompt and planned output)

Stop and tell the user, without repeating the value, if the prompt contains or the work would write:

- API keys, tokens, JWTs, OAuth secrets, session cookies, private keys (`-----BEGIN ... PRIVATE KEY-----`), AWS/GCP/Azure keys.
- Passwords or connection strings with embedded credentials (`postgres://user:pass@host/db`).
- Real `.env` contents, `OBSERVE_APP_SECRET`, `JWT_SECRET`, `DATABASE_URL` with a real password.
- Personal data: CPF/ID numbers, card numbers, real customer emails/phones, dumps of production rows.

When found:
1. Do **not** echo the value back, store it in memory, commit it, or put it in code, tests, fixtures, Dockerfiles, compose files or docs.
2. Tell the user it was detected and that it should be rotated if it is real.
3. Continue the task using an environment variable (`process.env` through `@nestjs/config`), a `.env.example` placeholder, or a Docker/Compose secret.

## Step 3: Stack-specific guardrails for the plan

- **NestJS**: validate every input (Standard Schema pipe or `ValidationPipe`), no secrets in code, configuration via `@nestjs/config`, no `any` on request data.
- **PostgreSQL**: parameterised queries only, schema changes as migrations, least-privilege DB role, no seed with real data.
- **Docker**: pin image tags (no `latest`), non-root `USER`, no secrets in `ENV`/`ARG`/`COPY`, `.dockerignore` covers `.env`.

## Step 4: Proceed

Summarise the interpretation in one line (`Goal / Scope / Done when`), flag any sensitive-data finding, then do the work. The pre-write and post-write hooks enforce lint, types, tests, complexity, comment limits and security rules afterwards.
