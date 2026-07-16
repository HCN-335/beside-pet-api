/**
 * summarizer.agent.ts — one-page recap built when the session closes.
 * Deterministic in mock mode: it reads the session's own state (reached task,
 * turn count, highest support level) and scans user turns for a small set of
 * grief emotions. Phase 3 swaps the body for an LLM summary; signature stays.
 */
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '@/shared/clock/clock';
import { isClosingTask, type TaskId } from '@/support/domain/model/grief-task';
import type { Session } from '@/support/domain/model/session';
import type { SessionSummary } from '@/support/domain/model/session-summary';
import { SUPPORT_CRISIS, SUPPORT_WATCH } from '@/support/domain/model/support-level';

interface EmotionSignal {
  emotion: string;
  pattern: RegExp;
}

const EMOTION_SIGNALS: EmotionSignal[] = [
  { emotion: 'longing', pattern: /그리워|보고\s*싶|그립/ },
  { emotion: 'guilt', pattern: /미안|죄책|내\s*탓/ },
  { emotion: 'anger', pattern: /화가|분노|억울/ },
  { emotion: 'fear', pattern: /무섭|두렵|불안/ },
  { emotion: 'emptiness', pattern: /허전|빈자리|공허/ },
];

@Injectable()
export class SummarizerAgent {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  summarize(session: Session): SessionSummary {
    const turnCount = session.analyses.length;
    return {
      at: this.clock.now(),
      reachedTask: session.task,
      turnCount,
      highestSupportLevel: session.supportLevel,
      headline: headlineFor(session.task, turnCount),
      emotionsNoted: emotionsIn(session),
      followUp: followUpFor(session.supportLevel),
    };
  }
}

/** Closing (task 5) means all four grief tasks were worked through. */
function headlineFor(reachedTask: number, turnCount: number): string {
  if (isClosingTask(reachedTask as TaskId)) {
    return `Worked through all 4 grief tasks across ${turnCount} turns.`;
  }
  return `Reached task ${reachedTask} of 4 across ${turnCount} turns.`;
}

function emotionsIn(session: Session): string[] {
  const said = session.history
    .filter((message) => message.role === 'user')
    .map((message) => message.text)
    .join(' ');
  return EMOTION_SIGNALS.filter((signal) => signal.pattern.test(said)).map(
    (signal) => signal.emotion,
  );
}

function followUpFor(level: number): string {
  if (level >= SUPPORT_CRISIS) {
    return 'Crisis resources were surfaced — encourage professional follow-up.';
  }
  if (level >= SUPPORT_WATCH) {
    return 'A gentle check-in soon is suggested.';
  }
  return 'Open to continue at their own pace.';
}
