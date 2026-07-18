/**
 * session-state-view.ts — compact session state returned by queries and turns.
 */
export interface SessionStateView {
  sessionId: string;
  task: number;
  taskLabel: string;
  progress: number;
  supportLevel: number;
  closed: boolean;
}
