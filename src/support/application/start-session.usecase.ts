/**
 * start-session.usecase.ts — use case for starting a session (= a single function).
 * Two entry paths:
 *  - first-time: onboarding provides a grief profile → new session at the first task.
 *  - returning: no profile provided → inherit the profile from the most recent
 *    session and resume where the previous one left off (cross-session continuity).
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { AccountRepository } from '@/identity/domain/port/account.repository';
import { ACCOUNT_REPOSITORY } from '@/identity/domain/port/tokens';
import { FIRST_TASK, isClosingTask, type TaskId } from '@/support/domain/model/grief-task';
import { Session } from '@/support/domain/model/session';
import type { SessionRepository } from '@/support/domain/port/session.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import type { TurnEvent } from './dto/turn-event';
import type { TurnResult } from './dto/turn-result';
import type { StartSessionCommand } from './start-session.command';
import { SupportOrchestrator } from './support.orchestrator';

/** Everything needed to greet a freshly created session. */
interface StartedSession {
  session: Session;
  resuming: boolean;
}

@Injectable()
export class StartSessionUseCase {
  constructor(
    private readonly orchestrator: SupportOrchestrator,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(command: StartSessionCommand): Promise<TurnResult> {
    const { session, resuming } = await this.create(command);
    await this.sessions.save(session);
    return this.orchestrator.greet(session, resuming);
  }

  /** Streaming variant — same session creation, greeting emitted as SSE events. */
  async *stream(command: StartSessionCommand): AsyncIterable<TurnEvent> {
    const { session, resuming } = await this.create(command);
    await this.sessions.save(session);
    yield* this.orchestrator.greetStream(session, resuming);
  }

  /**
   * Builds a first-time session from onboarding, or a continued one from history.
   * Either way the owner's account-level conversation language wins over the
   * profile snapshot, so the greeting already speaks the configured language.
   */
  private async create(command: StartSessionCommand): Promise<StartedSession> {
    const started = await this.createFromCommand(command);
    const owner = await this.accounts.findById(command.ownerId);
    if (owner?.chatLanguage) {
      started.session.adoptPreferredLanguage(owner.chatLanguage);
    }
    return started;
  }

  private async createFromCommand(command: StartSessionCommand): Promise<StartedSession> {
    if (command.griefProfile) {
      return {
        session: Session.start(command.sessionId, command.ownerId, command.griefProfile),
        resuming: false,
      };
    }
    const [previous] = await this.sessions.findByOwner(command.ownerId, 1);
    if (!previous) {
      throw new BadRequestException('No prior session to continue; onboarding is required.');
    }
    return {
      session: Session.start(
        command.sessionId,
        command.ownerId,
        previous.griefProfile,
        resumeTaskFrom(previous.task),
      ),
      resuming: true,
    };
  }
}

/** Resume at the stage the previous session reached; a completed arc starts a fresh pass. */
function resumeTaskFrom(reached: TaskId): TaskId {
  return isClosingTask(reached) ? FIRST_TASK : reached;
}
