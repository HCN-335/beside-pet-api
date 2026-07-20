/**
 * session-list-item.response.ts — one row of the owner's session list (mirrors SessionListItem).
 */
import type { Locale } from '@/shared/locale';

export class SessionListItemResponse {
  sessionId!: string;
  closed!: boolean;
  reachedTask!: number;
  progress!: number;
  petName?: string;
  preferredLanguage!: Locale;
  /** Whether the mind report can be viewed (wrapped up with enough progress). */
  reportAvailable!: boolean;
}
