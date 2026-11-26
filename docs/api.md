---
description: How to call the Agendai HTTP API, with examples for sign-up, creating a unit and listing records, and the meaning of each error status.
---

# API

The API speaks JSON over HTTP. Request bodies are validated with Zod, and an invalid body returns `400 Bad Request`. Every route except the authentication endpoints and `GET /metrics` needs an access token in the `Authorization` header. The full list of routes, with access rules and body schemas, is in the [generated endpoint reference](generated/endpoints.md).

## Conventions

- Identifiers are UUIDs. A malformed identifier in the path returns `400 Bad Request`.
- Lists return every row of the caller's tenant, sorted by name. The API has no pagination yet.
- Each resource follows the same pattern: `GET` a list, `GET` one record, `POST` to create, `PATCH` to change, and `DELETE` to remove. `PATCH` requires at least one field.
- A record that belongs to another tenant looks the same as one that does not exist. Both return `404 Not Found`.

## Errors

Errors use the standard NestJS body, which has a message, the status name and the status code:

```json
{ "message": "Unit not found", "error": "Not Found", "statusCode": 404 }
```

| Status | When it happens |
| --- | --- |
| `400 Bad Request` | The body or a path parameter fails validation, or a referenced unit or user does not belong to the tenant. |
| `401 Unauthorized` | The access token is missing, malformed, expired, or belongs to a user who no longer exists. |
| `403 Forbidden` | The caller is signed in but lacks the role the route requires. |
| `404 Not Found` | The record does not exist in the caller's tenant. |
| `409 Conflict` | The email is already registered, the user is already a professional, or the record is still referenced by other rows. |

## First requests

Set the base URL once, and replace the placeholder values with your own:

```bash
export API=http://localhost:3000
```

Sign up. This creates a tenant and its first admin, and returns the tokens:

```bash
curl -s "$API/auth/sign-up" \
  -H 'content-type: application/json' \
  -d '{"tenantName":"Clinic One","name":"Ada Lovelace","email":"ada@example.com","password":"use-a-long-passphrase"}'
```

Copy `accessToken` from the response into a variable:

```bash
export ACCESS_TOKEN=<accessToken from the response>
```

Create a unit:

```bash
curl -s "$API/units" \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Downtown","timezone":"America/Sao_Paulo"}'
```

List the units of the tenant:

```bash
curl -s "$API/units" -H "authorization: Bearer $ACCESS_TOKEN"
```

## Request bodies

| Endpoint | Body |
| --- | --- |
| `POST /units` | `name` (2 to 120 characters) and `timezone` (an IANA name, such as `America/Sao_Paulo`). |
| `POST /services` | `name` (2 to 120 characters), `durationMin` (5 to 1440), `bufferMin` (0 to 240, default 0) and `capacity` (1 to 500, default 1). A capacity of 1 means an individual service. |
| `POST /professionals` | `userId`, the id of a user with the `professional` role in the same tenant, and `unitId`, the id of a unit in the same tenant. |
| `POST /members` | `name`, `email`, `password` (12 to 128 characters) and `role` (`admin`, `professional` or `client`). |

`PATCH` on units and services accepts the same fields, all optional. `PATCH` on professionals takes only `unitId`, which is required.

## Metrics

`GET /metrics` is public and returns the Prometheus text format. See [Observability](observability.md) for what it reports, and for why it should stay on an internal network.
