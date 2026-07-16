/**
 * llm.port.ts — empathetic utterance generation port (out).
 * The domain only knows "generate this kind of utterance"; the adapter handles the Claude call/stub fallback.
 * The structural fields (task, progress, risk) are decided by the deterministic domain, and the LLM is responsible only for the utterance text.
 */
import type { ReplyPhaseName } from '../model/reply-phase';
import type { ReplyContext } from './reply-context';
import type { ReportBodies, ReportContext } from './report-context';

/** Utterance phase: first greeting / task question / gentle re-ask / closing. */
export type ReplyPhase = ReplyPhaseName;

export interface LlmPort {
  /** Active mode (live=Claude / stub=deterministic) identifier. Exposed in health. */
  readonly mode: 'live' | 'stub';
  /** Composes the whole utterance at once (used by the synchronous turn path). */
  composeReply(context: ReplyContext): Promise<string>;
  /**
   * Streams the utterance token by token (used by the SSE turn path).
   * The first token is emitted only after a realistic think delay (TTFT), so the
   * frontend can show the same "waiting then typing" shape it will have with Claude.
   */
  streamReply(context: ReplyContext): AsyncIterable<string>;
  /**
   * Writes the warm section bodies of the user-facing mind report from the
   * session's facts + transcript. Structural fields stay with the domain.
   */
  composeReportBodies(context: ReportContext): Promise<ReportBodies>;
  /**
   * Language-agnostic crisis screen of one user message (self-harm / suicidal
   * intent). Live uses the model so it works in any language; stub falls back to
   * the deterministic keyword check. Detection only — the crisis reply stays fixed.
   */
  assessRisk(text: string): Promise<boolean>;
}
