/**
 * session.ts — support session aggregate root.
 * Owns progress state, support level, and conversation history in one place, and state transitions happen only through methods.
 * Measurable progress (currentTask) and loop prevention (retryCount) are the core invariants of this aggregate.
 * Bound to an account (= the viewer who completed onboarding) via ownerId, providing the basis for ownership guards and per-company access.
 */

import type { GriefProfile } from './grief-profile';
import { FIRST_TASK, type TaskId } from './grief-task';
import { createMessage, type Message, type Role } from './message';
import type { SessionSummary } from './session-summary';
import { SUPPORT_SAFE, type SupportLevel } from './support-level';
import type { SupportPlan } from './support-plan';
import type { TurnAnalysis } from './turn-analysis';

export class Session {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly griefProfile: GriefProfile,
    private _task: TaskId,
    private _retryCount: number,
    private _supportLevel: SupportLevel,
    private _closed: boolean,
    private readonly _history: Message[],
    private _plan: SupportPlan | undefined,
    private readonly _analyses: TurnAnalysis[],
    private _summary: SessionSummary | undefined,
  ) {}

  /**
   * Starts a new session from the onboarding output (grief profile).
   * A first-time session enters the first support task; a continued session may
   * resume at a later task (where the previous session left off).
   */
  static start(
    id: string,
    ownerId: string,
    griefProfile: GriefProfile,
    startTask: TaskId = FIRST_TASK,
  ): Session {
    return new Session(
      id,
      ownerId,
      griefProfile,
      startTask,
      0,
      SUPPORT_SAFE,
      false,
      [],
      undefined,
      [],
      undefined,
    );
  }

  /** Restores from the persistence store (snapshot rehydration). */
  static rehydrate(snapshot: SessionSnapshot): Session {
    return new Session(
      snapshot.id,
      snapshot.ownerId,
      snapshot.griefProfile,
      snapshot.task,
      snapshot.retryCount,
      snapshot.supportLevel,
      snapshot.closed,
      [...snapshot.history],
      snapshot.plan,
      [...snapshot.analyses],
      snapshot.summary,
    );
  }

  get task(): TaskId {
    return this._task;
  }
  get retryCount(): number {
    return this._retryCount;
  }
  get supportLevel(): SupportLevel {
    return this._supportLevel;
  }
  get closed(): boolean {
    return this._closed;
  }
  get history(): readonly Message[] {
    return this._history;
  }
  get plan(): SupportPlan | undefined {
    return this._plan;
  }
  get analyses(): readonly TurnAnalysis[] {
    return this._analyses;
  }
  get summary(): SessionSummary | undefined {
    return this._summary;
  }

  record(role: Role, text: string, at: string): void {
    this._history.push(createMessage(role, text, this._task, at));
  }

  /** Sets the per-session plan (Planner output, once at the start). */
  setPlan(plan: SupportPlan): void {
    this._plan = plan;
  }

  /** Appends one turn's structured analysis. */
  recordAnalysis(analysis: TurnAnalysis): void {
    this._analyses.push(analysis);
  }

  /** Sets the closing summary (Summarizer output, once at the end). */
  setSummary(summary: SessionSummary): void {
    this._summary = summary;
  }

  advanceTo(task: TaskId): void {
    this._task = task;
    this._retryCount = 0;
  }

  registerRetry(): void {
    this._retryCount += 1;
  }

  raiseSupportLevel(level: SupportLevel): void {
    if (level > this._supportLevel) {
      this._supportLevel = level;
    }
  }

  close(): void {
    this._closed = true;
  }

  snapshot(): SessionSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      griefProfile: this.griefProfile,
      task: this._task,
      retryCount: this._retryCount,
      supportLevel: this._supportLevel,
      closed: this._closed,
      history: [...this._history],
      plan: this._plan,
      analyses: [...this._analyses],
      summary: this._summary,
    };
  }
}

export interface SessionSnapshot {
  id: string;
  ownerId: string;
  griefProfile: GriefProfile;
  task: TaskId;
  retryCount: number;
  supportLevel: SupportLevel;
  closed: boolean;
  history: Message[];
  plan?: SupportPlan;
  analyses: TurnAnalysis[];
  summary?: SessionSummary;
}
