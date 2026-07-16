/**
 * mind-report.agent.ts — builds the user-facing mind report when requested.
 * Lazy: generated on demand from a closed session's own data (profile, reached
 * stage, the internal summary's emotion scan, transcript). Structural fields are
 * deterministic here; the warm section bodies come from the LLM (stub fallback).
 */
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@/shared/clock/clock';
import { petNameOf, preferredLanguageOf } from '@/support/domain/model/grief-profile';
import { progressOf } from '@/support/domain/model/grief-task';
import {
  type MindReport,
  REPORT_SECTION_ORDER,
  REPORT_SECTION_TITLES,
} from '@/support/domain/model/mind-report';
import type { Session } from '@/support/domain/model/session';
import { isCrisis } from '@/support/domain/model/support-level';
import type { LlmPort } from '@/support/domain/port/llm.port';
import type { ReportContext } from '@/support/domain/port/report-context';
import { LLM_PORT } from '@/support/domain/port/tokens';

@Injectable()
export class MindReportAgent {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
  ) {}

  async build(session: Session): Promise<MindReport> {
    const locale = preferredLanguageOf(session.griefProfile);
    const context: ReportContext = {
      petName: petNameOf(session.griefProfile),
      griefProfile: session.griefProfile,
      reachedTask: session.task,
      progress: progressOf(session.task),
      locale,
      emotions: session.summary ? [...session.summary.emotionsNoted] : [],
      crisis: isCrisis(session.supportLevel),
      history: session.history,
    };
    const bodies = await this.llm.composeReportBodies(context);
    const titles = REPORT_SECTION_TITLES[locale];
    return {
      at: this.clock.now(),
      petName: context.petName,
      reachedTask: context.reachedTask,
      progress: context.progress,
      locale,
      sections: REPORT_SECTION_ORDER.map((key) => ({ key, title: titles[key], body: bodies[key] })),
    };
  }
}
