/**
 * support.query.ts — read-only queries (state, history). Verifies ownership, then returns views only.
 */
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Locale } from '@/shared/locale';
import { preferredLanguageOf } from '@/support/domain/model/grief-profile';
import { labelOf, progressOf } from '@/support/domain/model/grief-task';
import type { Message } from '@/support/domain/model/message';
import type { MindReport } from '@/support/domain/model/mind-report';
import type { Session } from '@/support/domain/model/session';
import type { SessionSummary } from '@/support/domain/model/session-summary';
import type { SupportPlan } from '@/support/domain/model/support-plan';
import type { TurnAnalysis } from '@/support/domain/model/turn-analysis';
import type { SessionRepository } from '@/support/domain/port/session.repository';
import { SESSION_REPOSITORY } from '@/support/domain/port/tokens';
import { MindReportAgent } from './mind-report.agent';
import { assertOwner, type Requester } from './ownership';

export interface SessionStateView {
  sessionId: string;
  task: number;
  taskLabel: string;
  progress: number;
  supportLevel: number;
  closed: boolean;
}

/** Full analysis view: transcript + plan + per-turn analyses + closing summary. */
export interface SessionAnalysisView {
  sessionId: string;
  closed: boolean;
  plan?: SupportPlan;
  analyses: TurnAnalysis[];
  summary?: SessionSummary;
  history: Message[];
}

/** One row of the owner's session list (newest first). */
export interface SessionListItem {
  sessionId: string;
  closed: boolean;
  reachedTask: number;
  taskLabel: string;
  progress: number;
  petName?: string;
  /** The session's conversation language — used to restore the returning user's UI locale. */
  preferredLanguage: Locale;
}

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
      taskLabel: labelOf(session.task),
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
      taskLabel: labelOf(session.task),
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
