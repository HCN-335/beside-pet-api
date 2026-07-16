/**
 * locale.ts — Response language. Kept 1:1 with the Locale in the frontend's i18n/config.ts.
 * Support messages are "content" the backend generates per locale, so the locale is passed with each request.
 */
export const LOCALES = ['ko', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** Normalizes external input such as query strings into a known locale (falls back to the default). */
export const resolveQueryLocale = (value: string | undefined): Locale =>
  value && isLocale(value) ? value : DEFAULT_LOCALE;
