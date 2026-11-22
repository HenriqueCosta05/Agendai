import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client';

const HTTP_LABELS = ['method', 'route', 'status'] as const;

export type HttpLabels = Record<(typeof HTTP_LABELS)[number], string>;

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpRequests = new Counter({
    name: 'agendai_http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: HTTP_LABELS,
    registers: [this.registry],
  });

  private readonly httpDuration = new Histogram({
    name: 'agendai_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: HTTP_LABELS,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'agendai_' });
  }

  observeHttp(labels: HttpLabels, seconds: number) {
    this.httpRequests.inc(labels);
    this.httpDuration.observe(labels, seconds);
  }

  render() {
    return this.registry.metrics();
  }

  get contentType() {
    return this.registry.contentType;
  }
}
