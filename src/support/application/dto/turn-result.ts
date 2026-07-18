/**
 * turn-result.ts — the result of a single turn. 1:1 with TurnResult in the frontend lib/api/types.ts.
 * Assertions target this observable contract (state), not the reply text.
 */
import { preferredLanguageOf } from '@/support/domain/model/grief-profile';
import { labelOf, progressOf } from '@/support/domain/model/grief-task';
import type { Session } from '@/support/domain/model/session';

export interface TurnResult {
  reply: string;
  task: number;
  taskLabel: string;
  progress: number; // 0..1
  supportLevel: number;
  done: boolean;
}

/** Builds a TurnResult from the session's current state plus the reply. */
export const toTurnResult = (session: Session, reply: string): TurnResult => ({
  reply,
  task: session.task,
  taskLabel: labelOf(session.task, preferredLanguageOf(session.griefProfile)),
  progress: progressOf(session.task),
  supportLevel: session.supportLevel,
  done: session.closed,
});
