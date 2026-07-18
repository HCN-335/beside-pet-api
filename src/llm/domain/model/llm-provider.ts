/**
 * llm-provider.ts — the set of wired text-model vendors.
 * Adding a vendor = one enum value + one provider adapter + a pricing row.
 */
export enum LlmProvider {
  Anthropic = 'anthropic',
}

export const isLlmProvider = (value: string): value is LlmProvider =>
  (Object.values(LlmProvider) as string[]).includes(value);
