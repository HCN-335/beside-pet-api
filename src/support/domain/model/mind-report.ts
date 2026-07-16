/**
 * mind-report.ts — the user-facing "mind report" shown when a session closes.
 * Distinct from the internal SessionSummary (analytical, for the company): this
 * is a warm, supportive reflection for the grieving user, in their language.
 * The structural fields are deterministic; the section bodies are LLM-written
 * (warm narrative), with a deterministic stub fallback.
 */
import type { Locale } from '@/shared/locale';
import type { TaskId } from './grief-task';

export type ReportSectionKey = 'journey' | 'emotions' | 'keepsake' | 'encouragement';

/** One card of the report: a fixed title + an LLM-written warm body. */
export interface MindReportSection {
  key: ReportSectionKey;
  title: string;
  body: string;
}

export interface MindReport {
  /** UTC instant the report was generated. */
  at: string;
  petName: string;
  reachedTask: TaskId;
  progress: number;
  locale: Locale;
  sections: MindReportSection[];
}

/** Card order in the report. */
export const REPORT_SECTION_ORDER: ReportSectionKey[] = [
  'journey',
  'emotions',
  'keepsake',
  'encouragement',
];

/** Fixed, localized card titles (bodies are written per session). */
export const REPORT_SECTION_TITLES: Record<Locale, Record<ReportSectionKey, string>> = {
  ko: {
    journey: '함께 걸어온 길',
    emotions: '마음에 담긴 감정',
    keepsake: '기억하고 싶은 것',
    encouragement: '다독임 한마디',
  },
  en: {
    journey: 'The path you walked',
    emotions: 'What your heart carried',
    keepsake: 'A keepsake to hold',
    encouragement: 'A word for you',
  },
};
