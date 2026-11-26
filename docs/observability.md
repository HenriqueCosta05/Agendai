---
description: How Agendai reports its health, with Prometheus metrics at /metrics and telemetry sent to NestJS Observe when keys are configured.
---

# Observability

Agendai reports its behavior in two places. Prometheus metrics are served by the API itself. Traces, errors, logs and runtime metrics go to NestJS Observe, when the API has keys for it.

## NestJS Observe

The SDK, `@nestjs/observe`, is set up in `src/shared/observe/observe.ts`. `AppModule` registers it with the keys from the environment, and `src/main.ts` passes its instrument to `NestFactory.create`. The service identifier is `agendai-api`.

The SDK sends nothing until both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are set. Without them the API logs a warning at startup and runs normally. To create the keys, run `npx @nestjs/observe link` and approve the code in the browser. The command writes both variables to `.env`. Give production its own key pair, and set it through the environment rather than a file.

The Docker Compose file does not pass the keys to the `api` container. See [Operations](operations.md#telemetry-in-the-container).

## Prometheus metrics

The API exposes Prometheus metrics at `GET /metrics`, built with `@prometheus-io/client`, the successor of `prom-client`.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `agendai_http_requests_total` | Counter | `method`, `route`, `status` | Requests handled. |
| `agendai_http_request_duration_seconds` | Histogram | `method`, `route`, `status` | Request duration, with buckets from 5 ms to 5 s. |
| `agendai_process_*` and `agendai_nodejs_*` | Various | None | Node.js defaults: CPU, memory, event loop lag, garbage collection and handles. |

Some details matter when you read the numbers:

- `route` is the route template, such as `/units/:id`, not the URL. The number of label values stays bounded this way. A request that matches no route is counted under `unmatched`.
- A middleware records each request when its response finishes. Requests refused by the guards, with status `401` or `403`, are counted too.
- A scrape of `GET /metrics` does not count itself.

Prometheus runs in the Compose stack on `http://localhost:9090`. It scrapes `api:3000/metrics` every 15 seconds, as set in `prometheus/prometheus.yml`.

Useful queries:

```promql
# Requests per second by route
sum by (route) (rate(agendai_http_requests_total[5m]))

# Share of 5xx responses
sum(rate(agendai_http_requests_total{status=~"5.."}[5m])) / sum(rate(agendai_http_requests_total[5m]))

# p95 latency by route
histogram_quantile(0.95, sum by (le, route) (rate(agendai_http_request_duration_seconds_bucket[5m])))
```

## Production notes

`/metrics` is public and has no authentication. Keep it on the internal network, or block the path at the reverse proxy. Prometheus and the database bind to `127.0.0.1` in `docker-compose.yml`, so they are not reachable from other machines. See [Operations](operations.md#exposure) for the API port.
