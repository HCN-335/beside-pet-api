/**
 * health.controller.ts — Exposes liveness + LLM mode (live/stub).
 *  GET /v1/health
 */
import { Controller, Get, Inject } from '@nestjs/common';
import type { LlmPort } from '@/support/domain/port/llm.port';
import { LLM_PORT } from '@/support/domain/port/tokens';

interface HealthView {
  status: 'ok';
  llm: 'live' | 'stub';
}

@Controller('v1/health')
export class HealthController {
  constructor(@Inject(LLM_PORT) private readonly llm: LlmPort) {}

  @Get()
  health(): HealthView {
    return { status: 'ok', llm: this.llm.mode };
  }
}
