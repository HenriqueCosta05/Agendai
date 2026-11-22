import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service.js';

const METRICS_ROUTE = '/metrics';
const UNMATCHED_ROUTE = 'unmatched';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      const route = (request.route as { path?: string } | undefined)?.path ?? UNMATCHED_ROUTE;
      if (route === METRICS_ROUTE) {
        return;
      }
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const labels = { method: request.method, route, status: String(response.statusCode) };
      this.metricsService.observeHttp(labels, seconds);
    });
    next();
  }
}
