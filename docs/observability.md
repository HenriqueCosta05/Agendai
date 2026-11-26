# Observability

Two complementary layers:

- **NestJS Observe** (`@nestjs/observe`) sends traces, errors, logs and runtime metrics to [observe.nestjs.com](https://observe.nestjs.com). It is wired in `src/shared/observe/observe.ts`, registered in `AppModule` and passed to `NestFactory.create` in `src/main.ts`.
- **Prometheus** metrics at `GET /metrics`, built with `@prometheus-io/client` (the successor of `prom-client`).

To link the app to Observe, run `npx @nestjs/observe link` and approve the code in the browser. It writes `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` to `.env`. Without them the API runs and sends nothing, and it logs a warning at startup. Production should get its own key pair, set through the environment rather than `.env`.

## Metrics

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `agendai_http_requests_total` | counter | `method`, `route`, `status` | Requests handled. |
| `agendai_http_request_duration_seconds` | histogram | `method`, `route`, `status` | Request duration. Buckets from 5 ms to 5 s. |
| `agendai_process_*`, `agendai_nodejs_*` | various | none | Node.js defaults: CPU, memory, event loop lag, GC, handles. |

Details:

- `route` is the route template (`/units/:id`), not the URL, so the number of label values stays bounded. Requests that match no route use `unmatched`.
- A middleware records the metrics when the response finishes. Requests rejected by the auth guards (`401`, `403`) are counted too.
- `GET /metrics` does not count itself.

## Running Prometheus

`docker compose up` starts Prometheus on `http://localhost:9090`. It scrapes `api:3000/metrics` every 15 seconds, as set in `prometheus/prometheus.yml`.

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

- `/metrics` is public. Do not publish it on the internet: keep it on the internal network, or block the path at the reverse proxy.
- Prometheus and the database ports are bound to `127.0.0.1` in `docker-compose.yml`.
