/**
 * grief-task.ts — Models the four grief journey stages as a value object.
 * The core domain concept that makes progress "measurable". 0 = onboarding, 5 = closing.
 * Matches the contract of the frontend TurnResult's task/taskLabel/progress.
 */
export type TaskId = 0 | 1 | 2 | 3 | 4 | 5;

export const TASK_LABELS: Record<TaskId, string> = {
  0: '온보딩',
  1: '상실의 현실 받아들이기',
  2: '슬픔의 감정 마주하기',
  3: '없는 일상에 적응하기',
  4: '연결을 간직하며 나아가기',
  5: '마무리',
};

const NEXT_TASK: Record<TaskId, TaskId> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5 };

/** First support task (entry point right after onboarding). */
export const FIRST_TASK: TaskId = 1;

/** Whether closing has been reached — determines session termination. */
export const isClosingTask = (task: TaskId): boolean => task >= 5;

export const labelOf = (task: TaskId): string => TASK_LABELS[task];

export const nextTask = (task: TaskId): TaskId => NEXT_TASK[task];

/** Overall journey progress (0~1). Based on tasks 1~4. */
export const progressOf = (task: TaskId): number => Math.min(Math.max(task - 1, 0) / 4, 1);
