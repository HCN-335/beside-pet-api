/**
 * send-message.usecase.ts — use case for sending one user turn (= a single function).
 * Restores the session, verifies ownership, then delegates to the orchestrator. A missing session raises a domain exception.
 */
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Session } from '@/support/domain/model/session';
import type { SessionRepository } from '@/support/domain/port/session.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import type { TurnEvent } from './dto/turn-event';
import type { TurnResult } from './dto/turn-result';
import { assertOwner, type Requester } from './ownership';
import { SupportOrchestrator } from './support.orchestrator';

export interface SendMessageCommand {
  sessionId: string;
  text: string;
  requester: Requester;
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    private readonly orchestrator: SupportOrchestrator,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute(command: SendMessageCommand): Promise<TurnResult> {
    const session = await this.loadWritableSession(command);
    return this.orchestrator.handle(session, command.text);
  }

  /** Streaming variant — same lookup/ownership checks, turn emitted as SSE events. */
  async *stream(command: SendMessageCommand): AsyncIterable<TurnEvent> {
    const session = await this.loadWritableSession(command);
    yield* this.orchestrator.handleStream(session, command.text);
  }

  /**
   * Restores the session and asserts it can still take a turn: it must exist, be
   * owned by the requester, and not be closed (a closed session is a safety hand-off
   * or a finished conversation, so further turns are rejected).
   */
  private async loadWritableSession(command: SendMessageCommand): Promise<Session> {
    const session = await this.sessions.findById(command.sessionId);
    if (!session) {
      throw new NotFoundException(`Session not found: ${command.sessionId}`);
    }
    assertOwner(session.ownerId, command.requester);
    if (session.closed) {
      throw new ConflictException('Session is already closed.');
    }
    return session;
  }
}
