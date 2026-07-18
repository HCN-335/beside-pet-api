/**
 * grief-task.ts — Models the four grief journey stages as a value object.
 * The core domain concept that makes progress "measurable". 0 = onboarding, 5 = closing.
 * Matches the contract of the frontend TurnResult's task/taskLabel/progress.
 */
export type TaskId = 0 | 1 | 2 | 3 | 4 | 5;

/** User-facing stage labels. */
export const TASK_LABELS: Record<TaskId, string> = {
  0: 'Onboarding',
  1: 'Accepting the reality of the loss',
  2: 'Facing the feelings of grief',
  3: 'Adjusting to daily life without them',
  4: 'Carrying the bond forward',
  5: 'Closing',
};

const NEXT_TASK: Record<TaskId, TaskId> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5 };

/** First support task (entry point right after onboarding). */
export const FIRST_TASK: TaskId = 1;

/** Whether closing has been reached — determines session termination. */
export const isClosingTask = (task: TaskId): boolean => task >= 5;

/** Stage label shown alongside progress. */
export const labelOf = (task: TaskId): string => TASK_LABELS[task];

export const nextTask = (task: TaskId): TaskId => NEXT_TASK[task];

/** Overall journey progress (0~1). Based on tasks 1~4. */
export const progressOf = (task: TaskId): number => Math.min(Math.max(task - 1, 0) / 4, 1);
