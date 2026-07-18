/**
 * crisis-pattern.ts — single source of truth for the deterministic crisis keyword screen.
 * Being rule-based (not LLM) keeps regression runs reproducible, and keeping the pattern in
 * one place stops the domain fast-path (SafetyCheckService) and the model-failure fallback
 * (ReplyComposerAdapter) from drifting apart. Multilingual (ko + en) because the support conversation defaults to English.
 * Detection only — the crisis reply itself stays fixed (see safety-resources.ts).
 */

/**
 * Self-harm / suicidal-intent signals. Grief hyperbole about missing the pet is not the target;
 * these are non-idiomatic phrasings. Case-insensitive for the English side.
 */
const CRISIS_PATTERN =
  /죽고\s*싶|살기\s*싫|사라지고\s*싶|따라가고\s*싶|kill myself|killing myself|end my life|want to die|suicid|self[-\s]?harm/i;

/** Whether one user message trips the deterministic crisis screen. */
export const matchesCrisis = (text: string): boolean => CRISIS_PATTERN.test(text);
