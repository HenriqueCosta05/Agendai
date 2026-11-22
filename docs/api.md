# API

Request bodies are validated with Zod. Invalid bodies return `400`. Send the access token as `Authorization: Bearer <token>`.

## Auth

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/sign-up` | public | Create a tenant and its first admin. Returns tokens. |
| POST | `/auth/token` | public | Sign in with email and password. Returns tokens. |
| POST | `/auth/token/refresh` | public | Exchange a refresh token for a new pair. |
| POST | `/auth/token/revoke` | public | Revoke a refresh token. |
| POST | `/members` | admin | Add a user (`admin`, `professional` or `client`) to the caller's tenant. |
| GET | `/me` | signed in | The current user. |

## Units, services and professionals

All three follow the same shape. Reads need any signed-in user. Writes need an admin.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/units`, `/services`, `/professionals` | List the tenant's records. |
| GET | `/<resource>/:id` | Get one record. `404` when it is not in the tenant. |
| POST | `/<resource>` | Create. |
| PATCH | `/<resource>/:id` | Update. At least one field is required. |
| DELETE | `/<resource>/:id` | Delete. `204` on success, `409` when still referenced. |

Bodies:

```jsonc
// POST /units
{ "name": "Downtown", "timezone": "America/Sao_Paulo" }

// POST /services (bufferMin defaults to 0, capacity to 1)
{ "name": "Consultation", "durationMin": 30, "bufferMin": 10, "capacity": 1 }

// POST /professionals (the user must have the "professional" role)
{ "userId": "<user uuid>", "unitId": "<unit uuid>" }
```

## First requests

```bash
curl -s localhost:3000/auth/sign-up -H 'content-type: application/json' \
  -d '{"tenantName":"Clinic One","name":"Ada","email":"ada@example.com","password":"a-long-passphrase"}'
```

The response contains `accessToken` and `refreshToken`. Use the access token for the other routes.

## Metrics

`GET /metrics` is public and returns the Prometheus text format. See [observability.md](observability.md).
