/**
 * support.query.ts — read-only queries (state, history). Verifies ownership, then returns views only.
 */
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { preferredLanguageOf } from '@/support/domain/model/grief-profile';
import { labelOf, progressOf } from '@/support/domain/model/grief-task';
import type { Message } from '@/support/domain/model/message';
import type { MindReport } from '@/support/domain/model/mind-report';
import type { Session } from '@/support/domain/model/session';
import type { SessionRepository } from '@/support/domain/port/session.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import { MindReportAgent } from './agent/mind-report.agent';
import type { SessionAnalysisView } from './dto/session-analysis-view';
import type { SessionListItem } from './dto/session-list-item';
import type { SessionStateView } from './dto/session-state-view';
import { assertOwner, type Requester } from './ownership';

/** How many recent sessions the list returns. */
const SESSION_LIST_LIMIT = 20;

@Injectable()
export class SupportQuery {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly mindReport: MindReportAgent,
  ) {}

  /** The signed-in owner's sessions, newest first (for the returning-user list). */
  async listForOwner(requester: Requester): Promise<SessionListItem[]> {
    const sessions = await this.sessions.findByOwner(requester.id, SESSION_LIST_LIMIT);
    return sessions.map((session) => ({
      sessionId: session.id,
      closed: session.closed,
      reachedTask: session.task,
      taskLabel: labelOf(session.task, preferredLanguageOf(session.griefProfile)),
      progress: progressOf(session.task),
      petName: session.griefProfile.petName,
      preferredLanguage: preferredLanguageOf(session.griefProfile),
    }));
  }

  /** User-facing mind report — generated lazily from the closed session. */
  async report(id: string, requester: Requester): Promise<MindReport> {
    const session = await this.require(id, requester);
    if (!session.closed) {
      throw new ConflictException('Session is not closed yet.');
    }
    return this.mindReport.build(session);
  }

  async state(id: string, requester: Requester): Promise<SessionStateView> {
    const session = await this.require(id, requester);
    return {
      sessionId: session.id,
      task: session.task,
      taskLabel: labelOf(session.task, preferredLanguageOf(session.griefProfile)),
      progress: progressOf(session.task),
      supportLevel: session.supportLevel,
      closed: session.closed,
    };
  }

  async history(id: string, requester: Requester): Promise<Message[]> {
    const session = await this.require(id, requester);
    return [...session.history];
  }

  async analysis(id: string, requester: Requester): Promise<SessionAnalysisView> {
    const session = await this.require(id, requester);
    return {
      sessionId: session.id,
      closed: session.closed,
      plan: session.plan,
      analyses: [...session.analyses],
      summary: session.summary,
      history: [...session.history],
    };
  }

  private async require(id: string, requester: Requester): Promise<Session> {
    const session = await this.sessions.findById(id);
    if (!session) {
      throw new NotFoundException(`Session not found: ${id}`);
    }
    assertOwner(session.ownerId, requester);
    return session;
  }
}
