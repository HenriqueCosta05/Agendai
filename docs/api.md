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

## Availability

`GET /units/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` returns the free slots of each individual service (capacity 1) in the unit. Both dates are local to the unit's timezone and included. The range can cover at most 31 days.

```bash
curl -s "$API/units/$UNIT_ID/availability?from=2026-03-02&to=2026-03-02" -H "authorization: Bearer $ACCESS_TOKEN"
```

Each service lists its slots, one per professional and start time, with `startsAt` and `endsAt` in UTC. `endsAt` is the end of the service, and the buffer after it is not included.

```json
[
  {
    "serviceId": "...",
    "serviceName": "Haircut",
    "durationMin": 50,
    "bufferMin": 10,
    "slots": [
      { "professionalId": "...", "startsAt": "2026-03-02T12:00:00.000Z", "endsAt": "2026-03-02T12:50:00.000Z" }
    ]
  }
]
```

The rules:

- A professional's weekly schedule gives the working windows, read in the unit's timezone.
- Slots follow each other every `durationMin + bufferMin` minutes, starting at the beginning of each window. A 09:00 to 12:00 window with a 50 minute service and a 10 minute buffer gives 09:00, 10:00 and 11:00.
- A slot is offered only when its service and buffer both fit inside the window.
- A slot is blocked when it overlaps the professional's time off, or a booking that is `pending` or `confirmed`. The booking's period must cover its service and buffer.
- Slots of one professional never block another professional.
- Slots in the past are not filtered out yet.

## Metrics

`GET /metrics` is public and returns the Prometheus text format. See [Observability](observability.md) for what it reports, and for why it should stay on an internal network.
