/**
 * reply-context.ts — everything the LLM adapter needs to compose one empathetic utterance.
 * The structural fields (phase, task) are decided by the deterministic domain.
 */
import type { Locale } from '@/shared/locale';
import type { TaskId } from '../model/grief-task';
import type { Message } from '../model/message';
import type { KnowledgeChunk } from './knowledge-chunk';
import type { ReplyPhase } from './llm.port';

export interface ReplyContext {
  phase: ReplyPhase;
  task: TaskId;
  petName: string;
  locale: Locale;
  knowledge: KnowledgeChunk[];
  history: readonly Message[];
  userText?: string;
}
