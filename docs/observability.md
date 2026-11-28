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
- Counters start from zero when the API restarts. Use `rate()` or `increase()` in queries, not the raw value.

Prometheus runs in the Compose stack, and the [run and check steps](#run-prometheus-with-the-stack) below show how to start it and confirm it scrapes the API.

For the full set of queries, grouped by requests and processing, see [Monitoring queries](monitoring.md).

Useful queries:

```promql
# Requests per second by route
sum by (route) (rate(agendai_http_requests_total[5m]))

# Share of 5xx responses
sum(rate(agendai_http_requests_total{status=~"5.."}[5m])) / sum(rate(agendai_http_requests_total[5m]))

# p95 latency by route
histogram_quantile(0.95, sum by (le, route) (rate(agendai_http_request_duration_seconds_bucket[5m])))
```

## Run Prometheus with the stack

Prometheus, the API and the database start together with Compose. Prometheus waits for the migrations to finish, as the API does.

```bash
cp .env.example .env          # then set JWT_SECRET and the database password
docker compose up -d --build
```

The files that configure Prometheus are in `prometheus/`, and Compose mounts that folder read-only:

- `prometheus.yml` sets the scrape job `agendai-api`, which scrapes `api:3000/metrics` every 15 seconds, and loads the rule file.
- `alerts.yml` holds the alert rules listed below.

The Prometheus web UI is at `http://localhost:9090`, bound to the host only.

### Check that it works

1. Open `http://localhost:9090/targets`. The `agendai-api` target shows `UP`. A `DOWN` state carries the scrape error.
2. Send a few requests, then run a query. Every request counted in the metric is a series with its method, route and status:

```bash
curl -s http://localhost:9090/api/v1/query --data-urlencode 'query=sum by (route, status) (agendai_http_requests_total)'
```

3. Open `http://localhost:9090/rules`. The three rules of the `agendai-api` group show `ok` health. The group appears with no firing alerts when the API is healthy.

To validate the Prometheus configuration and the rules without starting the stack, use the same image as Compose:

```bash
docker run --rm --entrypoint promtool -v "$PWD/prometheus:/etc/prometheus:ro" prom/prometheus:v3.7.0 check config /etc/prometheus/prometheus.yml
```

### Alert rules

The rules live in `prometheus/alerts.yml`. Prometheus evaluates them and shows the state on `http://localhost:9090/alerts`. No Alertmanager is part of the stack yet, so firing alerts are only visible in the UI.

| Alert | Condition | For | Severity |
| --- | --- | --- | --- |
| `AgendaiApiDown` | The `agendai-api` target cannot be scraped. | 1 minute | `critical` |
| `AgendaiHighServerErrorRate` | More than 5% of requests answer `5xx`. | 5 minutes | `warning` |
| `AgendaiSlowRoute` | The p95 latency of one route is above 1 second. | 10 minutes | `warning` |

To test the first rule, stop the API with `docker compose stop api`. The alert moves to `pending` and then to `firing` after about a minute and a half. Start it again with `docker compose start api`.

### Troubleshooting

- The `migrate` service fails with `password authentication failed for user "app"`. PostgreSQL reads `POSTGRES_PASSWORD` only when it creates the `pgdata` volume. If the volume already exists with another password, the API cannot start. Set the old password back in `.env`, or delete the volume with `docker compose down -v`, which also deletes the data.
- The `agendai-api` target is `DOWN`. Run `docker compose ps` and `docker compose logs api`. The API must be running in its container, because Prometheus scrapes `api:3000` on the Compose network.
- An API started on the host with `npm run start:dev` is not scraped. Its metrics are still available at `http://localhost:3000/metrics`, which is useful to check them by hand, but the Compose Prometheus does not reach that process.

## Production notes

`/metrics` is public and has no authentication. Keep it on the internal network, or block the path at the reverse proxy. Prometheus and the database bind to `127.0.0.1` in `docker-compose.yml`, so they are not reachable from other machines. See [Operations](operations.md#exposure) for the API port.
