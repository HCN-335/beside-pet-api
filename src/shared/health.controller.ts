/**
 * health.controller.ts — liveness probe.
 *  GET /v1/health
 */
import { Controller, Get } from '@nestjs/common';

interface HealthView {
  status: 'ok';
}

@Controller('v1/health')
export class HealthController {
  @Get()
  health(): HealthView {
    return { status: 'ok' };
  }
}
