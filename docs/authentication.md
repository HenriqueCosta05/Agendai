---
description: How Agendai authenticates users with passwords, short-lived JWT access tokens and rotating refresh tokens, and how it authorizes requests by role.
---

# Authentication

Agendai signs users in with an email and a password. The API then issues a short-lived access token and a refresh token. Requests carry the access token, and the server checks the role of the user on every protected route. This page describes the flow. The configuration lives in `src/app.module.ts` and `src/features/auth/`.

## Sign-up

`POST /auth/sign-up` creates a tenant and its first user, who has the `admin` role. It returns an access token and a refresh token, so the caller is signed in straight away.

If the email is already registered, the API returns `409 Conflict`. The password must be 12 to 128 characters long.

## Sign-in

`POST /auth/token` checks the email and the password. A wrong email and a wrong password return the same response, `401 Unauthorized` with the message `Invalid email or password`. Because both cases get the same answer, sign-in does not reveal which emails are registered.

Passwords are hashed with scrypt. When the hashing parameters change, the next successful sign-in stores a new hash.

## Access tokens

An access token is a JWT signed with `JWT_SECRET`. It lasts 15 minutes. The token carries the user id in `sub`, and its issuer and audience are both `agendai-api`.

Send the token in the `Authorization` header:

```text
Authorization: Bearer <access token>
```

The token identifies the user, but it does not carry the role or the tenant. On every request the API loads the user from PostgreSQL by `sub`. The role and tenant therefore always come from the database. A deleted user loses access as soon as the next request arrives, even if the token has not expired.

## Refresh tokens

A refresh token renews the access token without asking for the password again.

- `POST /auth/token/refresh` exchanges a refresh token for a new pair. The old refresh token cannot be used again.
- Each refresh token expires after 30 days.
- The tokens issued from one sign-in form a family. The family expires 90 days after that sign-in, and rotation does not extend it.
- If a token that was already used is presented again, the API revokes the whole family. Both parties then have to sign in again. This protects against a stolen token that is used after the legitimate client has rotated it.
- `POST /auth/token/revoke` signs out one device by revoking its family. It returns `204 No Content`.

![Sequence for POST /units, showing the JWT provider loading the user from the database before the unit is written](diagrams/create-unit-request.svg)

The diagram above shows how a protected request uses the access token. The refresh endpoints are public, so they take the refresh token in the body and no access token.

## Roles

Three roles exist: `admin`, `professional` and `client`. Only an `admin` can create members, units, services and professionals, and change or delete them. Every signed-in user can read them. The full table is in [Architecture](architecture.md#roles-and-authorization).

- A request without a valid access token receives `401 Unauthorized`.
- A signed-in user who lacks the role receives `403 Forbidden`.

## Creating members

An admin creates users in the same tenant with `POST /members`. The body includes the name, the email, a password of 12 to 128 characters, and the role. The new user can sign in at once.

## Storage

Refresh tokens are kept in the `refresh_tokens` table. The authentication library reads and writes that table. Users and their password hashes are kept in the `users` table. See the [data model](data-model.md) for both.
