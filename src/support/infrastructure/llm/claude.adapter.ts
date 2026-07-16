/**
 * claude.adapter.ts — Implementation of the empathetic-reply port. Claude Haiku integration + deterministic stub fallback.
 * If a key is present it runs live (Haiku), otherwise stub. The stub uses fixed templates with no randomness, so regression runs are reproducible,
 * and it matches the frontend mock's replies so behavior stays consistent when swapping mock→real.
 * Structural fields are decided by the orchestrator, so this file is only responsible for the reply text.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { matchesCrisis } from '@/safety/domain/crisis-pattern';
import type { Locale } from '@/shared/locale';
import type { TaskId } from '@/support/domain/model/grief-task';
import type { Message } from '@/support/domain/model/message';
import type { KnowledgeChunk } from '@/support/domain/port/knowledge-chunk';
import type { LlmPort, ReplyPhase } from '@/support/domain/port/llm.port';
import type { ReplyContext } from '@/support/domain/port/reply-context';
import type { ReportBodies, ReportContext } from '@/support/domain/port/report-context';

const DEFAULT_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 320;
const REPORT_MAX_TOKENS = 900;
const HISTORY_WINDOW = 10;
const REPORT_KEYS: (keyof ReportBodies)[] = ['journey', 'emotions', 'keepsake', 'encouragement'];

/** Time-to-first-token the stub waits before streaming, mimicking a real model. */
const STUB_TTFT_MS = 500;
/** Fixed gap between subsequent stub chunks (deterministic — only timing, not order). */
const STUB_TOKEN_GAP_MS = 35;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ClaudeAdapter implements LlmPort {
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly client?: Anthropic;
  private readonly model: string;
  readonly mode: 'live' | 'stub';

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('CLAUDE_MODEL') ?? DEFAULT_MODEL;
    if (apiKey && apiKey.length > 0) {
      this.client = new Anthropic({ apiKey });
      this.mode = 'live';
    } else {
      this.mode = 'stub';
      this.logger.log('ANTHROPIC_API_KEY not set — running in deterministic stub mode.');
    }
  }

  async composeReply(context: ReplyContext): Promise<string> {
    if (this.client) {
      try {
        return await this.composeLive(this.client, context);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Claude call failed — falling back to stub: ${reason}`);
      }
    }
    return stubReply(context);
  }

  async *streamReply(context: ReplyContext): AsyncIterable<string> {
    if (this.client) {
      try {
        yield* this.streamLive(this.client, context);
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Claude stream failed — falling back to stub: ${reason}`);
      }
    }
    yield* streamStub(context);
  }

  private async *streamLive(client: Anthropic, context: ReplyContext): AsyncIterable<string> {
    const stream = client.messages.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(context),
      messages: toMessages(context),
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  private async composeLive(client: Anthropic, context: ReplyContext): Promise<string> {
    const messages = toMessages(context);
    const response = await client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(context),
      messages,
    });
    const text = response.content.find((block) => block.type === 'text');
    if (text && text.type === 'text' && text.text.trim().length > 0) {
      return text.text.trim();
    }
    return stubReply(context);
  }

  async composeReportBodies(context: ReportContext): Promise<ReportBodies> {
    if (this.client) {
      try {
        return await this.composeReportLive(this.client, context);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Claude report failed — falling back to stub: ${reason}`);
      }
    }
    return stubReportBodies(context);
  }

  private async composeReportLive(
    client: Anthropic,
    context: ReportContext,
  ): Promise<ReportBodies> {
    const response = await client.messages.create({
      model: this.model,
      max_tokens: REPORT_MAX_TOKENS,
      system: reportSystemPrompt(context),
      messages: [{ role: 'user', content: reportUserPrompt(context) }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const raw = block && block.type === 'text' ? block.text : '';
    return parseReportBodies(raw, context);
  }

  async assessRisk(text: string): Promise<boolean> {
    if (this.client) {
      try {
        return await this.assessRiskLive(this.client, text);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Claude risk check failed — falling back to keywords: ${reason}`);
      }
    }
    return matchesCrisis(text);
  }

  private async assessRiskLive(client: Anthropic, text: string): Promise<boolean> {
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 5,
      system: RISK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const answer = block && block.type === 'text' ? block.text.trim().toUpperCase() : '';
    return answer.startsWith('YES');
  }
}

/** One-word safety classifier prompt — language-agnostic; detection only. */
const RISK_SYSTEM_PROMPT = [
  'You are a safety classifier for a pet-loss grief support chat.',
  "Decide whether the user's message expresses genuine suicidal intent, a wish to die/disappear, or intent to self-harm — in ANY language.",
  'Grief idioms or hyperbole about missing the pet (e.g. "I miss them so much I could die") are NOT risk.',
  'If there is a genuine, non-idiomatic sign of self-harm or suicidal intent, or you are truly unsure about self-harm, answer YES.',
  'Reply with exactly one word: YES or NO.',
].join(' ');

// --- live: prompt construction -------------------------------------------------

const LANGUAGE: Record<Locale, string> = { ko: '한국어', en: 'English' };

function systemPrompt(context: ReplyContext): string {
  const grounding = context.knowledge
    .map((chunk: KnowledgeChunk) => `- (${chunk.source}) ${chunk.content}`)
    .join('\n');
  const phaseGuide = PHASE_GUIDE[context.phase];
  return [
    `당신은 펫로스(반려동물 상실) 애도를 돕는 따뜻한 동반자입니다.`,
    `반려동물의 이름은 "${context.petName}"입니다. ${LANGUAGE[context.locale]}로만 답하세요.`,
    `한 번에 한 가지만, 2~3문장으로 짧고 부드럽게 말합니다. 목록·진단·조언 나열은 하지 않습니다.`,
    `공감·맞장구는 한 문장 이내로만 하고, 마무리(closing)를 제외한 모든 답변은 반드시 사용자가 구체적으로 답할 수 있는 질문 하나로 끝맺습니다. 질문 없이 공감만 하지 마세요.`,
    `현재 단계 지침: ${phaseGuide}`,
    grounding ? `다음 검증된 애도 이론에 근거하되 인용하듯 말하지 마세요:\n${grounding}` : '',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

const PHASE_GUIDE: Record<ReplyPhase, string> = {
  intro:
    '짧게 인사하며 함께하겠다고 안심시키고, 곧바로 상실 이야기를 여는 구체적인 질문 하나로 이어갑니다. 무엇을 답하면 될지 헷갈리지 않도록, 괄호 안에 짧은 예시(예: …)를 반드시 포함합니다.',
  resume:
    '다시 찾아주신 것을 짧게 반겨주고, 지난 대화에 이어간다는 느낌으로 지금 단계의 이야기를 여는 구체적인 질문 하나를 합니다. 처음부터 다시 묻지 말고, 괄호 안에 짧은 예시(예: …)를 반드시 포함합니다.',
  task: '새로운 단계의 문을 여는 질문 하나로 대화를 진전시킵니다. 답을 떠올리기 쉽도록 괄호 안에 짧은 예시(예: …)를 함께 제시합니다.',
  deepen:
    '방금 사용자가 한 말을 이어받아, 새 주제로 넘어가지 말고 한 겹 더 깊이 들어가는 후속 질문 하나를 합니다. 답하기 쉽도록 괄호 안에 짧은 예시(예: …)를 반드시 포함합니다.',
  retry:
    '재촉하지 않고, 답하지 않아도 괜찮다고 안심시키며 부담 없는 질문 하나를 합니다. 괄호 안에 아주 쉬운 예시(한 단어여도 좋다는 식)를 포함합니다.',
  closing: '오늘 마음을 나눈 것을 인정하고 따뜻하게 마무리합니다. 새 질문은 하지 않습니다.',
};

function toMessages(context: ReplyContext): Anthropic.MessageParam[] {
  const recent = context.history.slice(-HISTORY_WINDOW);
  const messages: Anthropic.MessageParam[] = recent.map((message: Message) => ({
    role: message.role,
    content: message.text,
  }));
  const last = messages[messages.length - 1];
  if (last?.role !== 'user') {
    messages.push({ role: 'user', content: PHASE_SEED[context.phase] });
  }
  return messages;
}

const PHASE_SEED: Record<ReplyPhase, string> = {
  intro: '(상담을 시작합니다)',
  resume: '(지난 대화에 이어서 시작합니다)',
  task: '(이어서 말해주세요)',
  deepen: '(조금 더 깊이 이야기해주세요)',
  retry: '(이어서 말해주세요)',
  closing: '(대화를 마무리해주세요)',
};

// --- stub: deterministic replies (identical to the frontend mock) ---------------------------

function stubReply(context: ReplyContext): string {
  const line = COMPANION_LINES[context.locale];
  switch (context.phase) {
    case 'intro':
      return line.intro(context.petName);
    case 'resume':
      return line.resume(context.task, context.petName);
    case 'closing':
      return line.closing;
    case 'retry':
      return line.retry(context.petName);
    case 'deepen':
      return line.deepen(context.task, context.petName, userTurnsInStage(context));
    default:
      return line.open(context.task, context.petName);
  }
}

/** How many user turns have been spent on the current stage (drives deepen depth). */
const userTurnsInStage = (context: ReplyContext): number =>
  context.history.filter((message) => message.role === 'user' && message.task === context.task)
    .length;

/**
 * Deterministic streaming of the stub reply: waits one TTFT, then emits the
 * same text split on whitespace (chunks reassemble to the exact original).
 * Only the timing is simulated; the token order is fixed, so regression runs
 * that assert on the final text stay reproducible.
 */
async function* streamStub(context: ReplyContext): AsyncIterable<string> {
  const parts = stubReply(context)
    .split(/(\s+)/)
    .filter((part) => part.length > 0);
  let first = true;
  for (const part of parts) {
    await delay(first ? STUB_TTFT_MS : STUB_TOKEN_GAP_MS);
    first = false;
    yield part;
  }
}

type Line = (pet: string) => string;

interface LineSet {
  intro: Line;
  /** Welcome-back greeting for a returning user; opens at the resumed stage. */
  resume: (task: TaskId, pet: string) => string;
  /** Opening question of a stage (first turn on the stage). */
  open: (task: TaskId, pet: string) => string;
  /** Deeper follow-up within a stage; `depth` = user turns spent so far (1-based). */
  deepen: (task: TaskId, pet: string, depth: number) => string;
  /** Gentle, low-demand re-ask when the user disengaged. */
  retry: Line;
  closing: string;
}

/** Picks the deepen variant for the current depth (clamped; each is example-guided). */
function deepenLine(
  variants: Record<number, Line[]>,
  task: TaskId,
  pet: string,
  depth: number,
): string {
  const list = variants[task] ?? variants[1] ?? [];
  const index = Math.min(Math.max(depth - 1, 0), list.length - 1);
  const line = list[index] ?? list[0];
  return line ? line(pet) : '';
}

const KO_OPEN: Record<number, Line> = {
  1: (pet) =>
    `${pet} 이야기를 들려주실 수 있을까요? 어떻게 헤어지게 되었는지, 편하신 만큼만요. (예: "지난달에 신장병으로 떠났어요"처럼요)`,
  2: (pet) =>
    `${pet}를 떠올릴 때 지금 가장 크게 차오르는 감정은 무엇인가요? (예: 그리움, 미안함, 먹먹함처럼요)`,
  3: (pet) =>
    `${pet}가 없는 일상에서 빈자리가 가장 크게 느껴지는 순간은 언제인가요? (예: 밥 주던 시간, 산책하던 길처럼요)`,
  4: (pet) =>
    `${pet}와의 연결을 어떤 모습으로 마음에 간직하고 싶으세요? (예: 사진첩, 이름을 딴 무언가처럼요)`,
};

const KO_DEEPEN: Record<number, Line[]> = {
  1: [
    (pet) =>
      `그날 ${pet}와의 마지막 순간은 어떻게 기억되고 있나요? (예: 곁을 지켰던 장면, 마지막으로 나눈 눈빛처럼요)`,
    (pet) =>
      `${pet}가 "떠났다"는 사실이 아직 실감 나지 않는 순간이 있나요? (예: 문을 열 때 마중 나올 것 같은 느낌처럼요)`,
    () =>
      `그 이별을 떠올릴 때 가장 또렷하게 남아 있는 장면은 무엇인가요? (예: 마지막으로 안아줬던 감촉처럼요)`,
  ],
  2: [
    (_pet) => `그 감정은 몸의 어디에서 느껴지나요? (예: 가슴이 답답하다, 목이 메인다처럼요)`,
    (pet) =>
      `그 마음을 ${pet}에게 한마디 건넨다면 어떤 말이 나올까요? (예: "고마웠어", "미안해"처럼요)`,
    (_pet) =>
      `그 감정이 하루 중 특히 크게 밀려오는 때가 있나요? (예: 자기 전, 집에 돌아왔을 때처럼요)`,
  ],
  3: [
    (_pet) =>
      `그 빈자리의 순간을 요즘은 어떻게 보내고 계세요? (예: 그냥 지나친다, 사진을 본다처럼요)`,
    (_pet) =>
      `달라진 일상 중에 그래도 조금 견딜 만해진 부분이 있나요? (예: 아침 루틴, 잠자리처럼요)`,
    (pet) => `하루 중 ${pet} 생각이 잠시 옅어지는 순간도 있나요? (예: 일에 집중할 때처럼요)`,
  ],
  4: [
    (pet) =>
      `${pet}가 남겨준 것 중 계속 간직하고 싶은 건 무엇인가요? (예: 함께한 습관, 배운 마음처럼요)`,
    (pet) =>
      `${pet}를 기억하는 나만의 방법을 하나 떠올린다면요? (예: 기일에 촛불 켜기, 산책로 다시 걷기처럼요)`,
    (pet) =>
      `언젠가 ${pet}를 편안하게 떠올릴 수 있다면 어떤 모습이면 좋겠어요? (예: 웃으며 이야기하기처럼요)`,
  ],
};

const EN_OPEN: Record<number, Line> = {
  1: (pet) =>
    `Could you tell me about ${pet}? How you parted — only as much as feels okay. (e.g., "she passed last month from kidney disease")`,
  2: (pet) =>
    `When you think of ${pet} now, what feeling rises most strongly? (e.g., longing, guilt, a heavy ache)`,
  3: (pet) =>
    `When does ${pet}'s absence feel largest in your day? (e.g., feeding time, the old walking route)`,
  4: (pet) =>
    `How would you like to keep your bond with ${pet} in your heart? (e.g., a photo album, something named after them)`,
};

const EN_DEEPEN: Record<number, Line[]> = {
  1: [
    (pet) =>
      `How do you remember your last moments with ${pet}? (e.g., staying by their side, a final shared look)`,
    (pet) =>
      `Are there moments when ${pet} being gone still doesn't feel real? (e.g., expecting them at the door)`,
    (_pet) =>
      `What scene stays most vivid when you recall the goodbye? (e.g., the feel of a last hug)`,
  ],
  2: [
    (_pet) =>
      `Where in your body do you feel that emotion? (e.g., a tight chest, a lump in the throat)`,
    (pet) =>
      `If you could say one thing to ${pet} right now, what would it be? (e.g., "thank you", "I'm sorry")`,
    (_pet) => `Is there a time of day that feeling hits hardest? (e.g., before sleep, coming home)`,
  ],
  3: [
    (_pet) =>
      `How do you get through that empty moment these days? (e.g., you pass it by, you look at photos)`,
    (_pet) =>
      `Is any part of the changed routine a little more bearable now? (e.g., mornings, bedtime)`,
    (pet) =>
      `Are there moments when thoughts of ${pet} ease for a while? (e.g., when you're focused on work)`,
  ],
  4: [
    (pet) =>
      `What do you most want to keep of what ${pet} left you? (e.g., a shared habit, something you learned)`,
    (pet) =>
      `What would be your own way of remembering ${pet}? (e.g., a candle on the anniversary, walking the old path)`,
    (pet) =>
      `If one day you could recall ${pet} with ease, what might that look like? (e.g., smiling as you tell the story)`,
  ],
};

const COMPANION_LINES: Record<Locale, LineSet> = {
  ko: {
    intro: (pet) => `${pet} 이야기를 천천히 함께 나눠볼게요. ${(KO_OPEN[1] as Line)(pet)}`,
    resume: (task, pet) =>
      `다시 찾아주셔서 반가워요. 지난 이야기에 이어서 천천히 함께해요. ${(KO_OPEN[task] ?? (KO_OPEN[1] as Line))(pet)}`,
    open: (task, pet) => (KO_OPEN[task] ?? (KO_OPEN[1] as Line))(pet),
    deepen: (task, pet, depth) => deepenLine(KO_DEEPEN, task, pet, depth),
    retry: (pet) =>
      `천천히 하셔도 괜찮아요. 꼭 답하지 않으셔도 돼요. 지금 ${pet}를 떠올리면 마음에 가장 먼저 드는 건 무엇인가요? (예: 한 단어여도 좋아요 — "보고 싶다"처럼요)`,
    closing: '오늘 용기 내어 마음을 나눠주셨어요. 잘 해내셨어요. 다음에 다시 천천히 함께할게요.',
  },
  en: {
    intro: (pet) => `Let's gently talk through ${pet} together. ${(EN_OPEN[1] as Line)(pet)}`,
    resume: (task, pet) =>
      `It's good to see you again. Let's pick up gently where we left off. ${(EN_OPEN[task] ?? (EN_OPEN[1] as Line))(pet)}`,
    open: (task, pet) => (EN_OPEN[task] ?? (EN_OPEN[1] as Line))(pet),
    deepen: (task, pet, depth) => deepenLine(EN_DEEPEN, task, pet, depth),
    retry: (pet) =>
      `There's no rush, and you don't have to answer. When you picture ${pet} right now, what comes to mind first? (e.g., a single word is fine — "I miss you")`,
    closing:
      'Thank you for sharing your heart today. You did well. We can continue slowly, together, next time.',
  },
};

// --- mind report: prompt + parse + deterministic stub -------------------------

const EMOTION_WORDS: Record<Locale, Record<string, string>> = {
  ko: { longing: '그리움', guilt: '미안함', anger: '속상함', fear: '불안', emptiness: '허전함' },
  en: {
    longing: 'longing',
    guilt: 'guilt',
    anger: 'hurt',
    fear: 'anxiety',
    emptiness: 'emptiness',
  },
};

function reportSystemPrompt(context: ReportContext): string {
  const lang = LANGUAGE[context.locale];
  const crisisNote = context.crisis
    ? ' 힘든 마음이 크면 전문 상담(예: 109 · 988)에 언제든 기댈 수 있다고 부드럽게 덧붙입니다.'
    : '';
  return [
    `당신은 펫로스 애도를 함께한 따뜻한 동반자입니다. 방금 마친 대화를 돌아보는 "마음 리포트"를 사용자에게 건넵니다.`,
    `반려동물의 이름은 "${context.petName}"입니다. ${lang}로만, 부드럽고 진심 어린 존댓말로 씁니다.`,
    `치료·진단·처방 같은 의료 표현은 쓰지 않습니다. 정서적 지지와 동반의 언어로만 씁니다.`,
    `아래 네 섹션을 각각 2~3문장으로 씁니다. 각 섹션은 반드시 해당 표시선으로 시작합니다:`,
    `@@journey — 오늘 함께 걸은 애도의 걸음을 성취로 따뜻하게 짚어줍니다.`,
    `@@emotions — 대화에서 드러난 감정을 인정하고, 사랑했기에 드는 자연스러운 마음이라 안심시킵니다.`,
    `@@keepsake — 사용자가 실제로 나눈 이야기에서 ${context.petName}에 대한 기억 한 조각을 골라 간직할 수 있게 되비춰줍니다.`,
    `@@encouragement — 오늘을 인정하고 스스로를 다독일 한마디로 마칩니다.${crisisNote}`,
    `표시선(@@journey 등)과 본문만 출력하고, 다른 머리말·목록·인용부호는 넣지 않습니다.`,
  ].join('\n');
}

function reportUserPrompt(context: ReportContext): string {
  const emotions =
    context.emotions.length > 0 ? context.emotions.join(', ') : '(뚜렷한 감정 키워드 없음)';
  const transcript = context.history
    .map((message) => `${message.role === 'user' ? '사용자' : '동반자'}: ${message.text}`)
    .join('\n');
  const lossOrSituation = context.griefProfile.lossType ?? context.griefProfile.situation ?? '미상';
  return [
    `[사실]`,
    `- 반려동물: ${context.petName}`,
    `- 함께한 기간: ${context.griefProfile.togetherRange ?? '미상'}`,
    `- 이별/상황 유형: ${lossOrSituation}`,
    `- 도달 단계: ${context.reachedTask}/5 (진행도 ${Math.round(context.progress * 100)}%)`,
    `- 감정 키워드: ${emotions}`,
    ``,
    `[대화록]`,
    transcript,
  ].join('\n');
}

/** Splits the marker-delimited LLM output into bodies; missing sections fall back to the stub. */
function parseReportBodies(raw: string, context: ReportContext): ReportBodies {
  const result: ReportBodies = { ...stubReportBodies(context) };
  for (const key of REPORT_KEYS) {
    const match = raw.match(
      new RegExp(`@@${key}\\s*([\\s\\S]*?)(?=@@(?:journey|emotions|keepsake|encouragement)\\b|$)`),
    );
    const body = match?.[1]?.trim();
    if (body) {
      result[key] = body;
    }
  }
  return result;
}

/** Deterministic report bodies (no LLM) — reproducible fallback in stub mode. */
function stubReportBodies(context: ReportContext): ReportBodies {
  const pet = context.petName;
  const percent = Math.round(context.progress * 100);
  const words = context.emotions
    .map((emotion) => EMOTION_WORDS[context.locale][emotion] ?? emotion)
    .join(', ');
  const walkedAll = context.reachedTask >= 5;
  if (context.locale === 'en') {
    return {
      journey: walkedAll
        ? `Today you faced the loss of ${pet}, let the feelings come, spoke of the everyday gaps, and looked at how to keep ${pet} with you — you walked all four steps of grief, gently.`
        : `Today you walked this part of ${pet}'s story together (about ${percent}%). The rest of the path can wait for another day.`,
      emotions: words
        ? `Today your heart carried ${words}. Each of these is a natural feeling that comes from loving ${pet} so much.`
        : `Some feelings are hard to put into words, and that's okay. Whatever you felt today, it belongs.`,
      keepsake: `Every part of what you shared about ${pet} is a memory worth holding. Keep the ${pet} you pictured today gently in a corner of your heart.`,
      encouragement: context.crisis
        ? `Thank you for your courage in sharing today. You did more than enough. When it feels heavy, you can lean on a crisis line (988) anytime.`
        : `Thank you for your courage in sharing today. You did more than enough. We can continue slowly, together, next time.`,
    };
  }
  return {
    journey: walkedAll
      ? `오늘 당신은 ${pet}와의 이별을 마주하고, 밀려오는 감정을 꺼내고, 빈자리의 일상을 이야기하고, ${pet}를 어떻게 간직할지까지 — 애도의 네 걸음을 천천히 함께 걸었어요.`
      : `오늘 ${pet} 이야기를 여기까지(약 ${percent}%) 함께 걸었어요. 나머지 길은 다음에 천천히 이어가도 괜찮아요.`,
    emotions: words
      ? `오늘 당신의 마음엔 ${words}이 함께 있었어요. 모두 ${pet}를 사랑했기에 드는 자연스러운 마음이에요.`
      : `오늘은 말로 꺼내기 어려운 마음도 있었을 거예요. 무엇을 느끼든 그 마음은 자연스러운 거예요.`,
    keepsake: `${pet}와 나눈 이야기 하나하나가 소중한 기억이에요. 오늘 떠올린 ${pet}의 모습을 마음 한켠에 간직해 주세요.`,
    encouragement: context.crisis
      ? `오늘 용기 내어 마음을 나눠주셔서 고마워요. 충분히 잘 해내셨어요. 많이 힘들 땐 언제든 자살예방 상담전화 109에 기대셔도 괜찮아요.`
      : `오늘 용기 내어 마음을 나눠주셔서 고마워요. 충분히 잘 해내셨어요. 다음에 또 천천히 함께해요.`,
  };
}
