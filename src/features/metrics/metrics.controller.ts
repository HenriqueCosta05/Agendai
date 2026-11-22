import { Controller, Get, Res } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import type { Response } from 'express';
import { MetricsService } from './metrics.service.js';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async scrape(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Content-Type', this.metricsService.contentType);
    return this.metricsService.render();
  }
}
