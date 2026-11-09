// 피드백 · 번역 프롬프트와 받은 결과 다듬기. 벤더와 무관한 글이라 `companion-llm.ts`(Anthropic 호출)에서 떼어 둡니다.
// `companion-eval`이 같은 `feedback()` · `translate()`를 부르므로 여기를 고치면 평가 결과도 함께 바뀝니다.

import type {
  Feedback,
  FeedbackHistoryEntry,
  FeedbackRequest,
  HistoryEntry,
  Segment,
} from "./chat-send.contract.ts";
import { segmentsToPlain } from "./companion-segments.ts";

/** 피드백에 맥락으로 넣는 최근 메시지 수(유저 · 캐릭터 합쳐 — 약 세 번 주고받기). 설정이 아니라 상수다. */
export const feedbackHistoryLimit = 6;
const feedbackLineLimit = 500;

/** 최근 대화를 피드백 맥락으로 — 글자만(번역 · 태그 없음), 빈 줄 빼고, 마지막 `feedbackHistoryLimit`개. */
export function recentFeedbackHistory(
  history: readonly (HistoryEntry | FeedbackHistoryEntry)[],
): FeedbackHistoryEntry[] {
  return history
    .map((entry): FeedbackHistoryEntry => ({
      role: entry.role,
      text: ("text" in entry ? entry.text : segmentsToPlain(entry.segments))
        .trim()
        .slice(0, feedbackLineLimit),
    }))
    .filter((entry) => entry.text !== "")
    .slice(-feedbackHistoryLimit);
}

/** 관계 말투 규칙. 존댓말 → 반말은 부드럽게(better), 반말 관계의 존댓말은 늘 괜찮다. */
function speechLevelRule(request: FeedbackRequest): string {
  const elder =
    "If the character is a teacher or an elder, treat 반말 to them as in the polite case.";
  if (request.speechLevel === "polite") {
    // 덕수쌤처럼 페르소나가 `banmalFeedback: correction`이면 교정으로 — 다른 캐릭터는 부드럽게 제안만.
    if (request.character?.banmalFeedback === "correction")
      return `The relationship is polite (존댓말) and this character expects 존댓말 from learners. If the learner writes in 반말, use kind "correction" with one item per 반말 ending, corrected to polite style.`;
    return `The relationship is still polite (존댓말). If the learner writes in 반말 throughout, use kind "better" with the same sentence in polite style and a one-sentence explanation — not a correction.`;
  }
  if (request.speechLevel === "casual" || request.speechLevel === "slang")
    return `The relationship is casual, so 반말 is fine. ${elder} 존댓말 is always acceptable — never give feedback on it.`;
  return `The relationship's speech level is unknown: give no feedback on choosing 존댓말 or 반말 (mixing inside one message is still a mistake). ${elder}`;
}

export function feedbackSystem(request: FeedbackRequest): string {
  const language = request.l1 ?? "en";
  return `You give feedback on one chat message a Korean learner sent to a chat character. Write meanings, reasons and explanations in the language with BCP 47 tag "${language}". Too much feedback tires learners: give only what clearly helps, and when unsure return status "none".

The recent conversation, if given, is context only: give feedback on the latest learner message only — never on earlier messages or on the character's lines.

Decide in this order and use exactly one kind:
1. Non-Korean parts. If any part of the message is not Korean (the whole message, or some words or a clause in another language), use kind "l1_to_ko". "l1ToKo.text" is the whole message as natural Korean: keep the learner's Korean parts, put the rest into Korean, and silently fix any Korean mistakes in it. "l1ToKo.meaning" is its meaning. "l1ToKo.text" is only the Korean sentence — no quotes, labels or notes. Leave "items" and "better" null. Never explain why it should be in Korean and never comment on the choice of language. Names, brands and acronyms usually written in Latin letters (BTS, iPhone, K-pop), numbers and emoji are not non-Korean parts.
2. Mistakes. Use kind "correction" with one item per mistake (original fragment, corrected fragment, reason) for grammar, particles, conjugation, spelling and typos, wrong words, and speech levels mixed inside one message (e.g. "안녕하세요! 뭐 해?" — make the whole message one level, matching the relationship). Spacing only when it changes the meaning or makes the sentence hard to read; ignore ordinary chat spacing slips. You may also fill "better" if the corrected sentence is still clearly unnatural.
3. Speech level. ${speechLevelRule(request)}
4. Naturalness. Use kind "better" only when the sentence is clearly unnatural or translationese to a native speaker (e.g. pronoun overuse like "나는 너를 좋아해요", word-for-word calques). Give one suggestion: "better.text" in Korean, "better.meaning", and "better.explanation" in one plain sentence. Never suggest alternatives for a sentence that is already natural.
5. Otherwise use status "none" and leave everything else null.

Never give feedback on chat conventions: ㅋㅋ, ㅎㅎ, ㅇㅇ, ~ endings, emoji, missing punctuation, or casual style natives use.
A reason states the rule plainly in one short sentence (e.g. "이에요 attaches directly to the noun."). No comments about the learner, the character or the conversation.`;
}

export function feedbackContent(request: FeedbackRequest): string {
  const character =
    request.character === null
      ? ""
      : `Character: ${request.character.name}${request.character.role ? ` (${request.character.role})` : ""}\n`;
  const level =
    request.speechLevel === null ? "" : `Relationship speech level: ${request.speechLevel}\n`;
  // 최근 대화가 있으면 그것이 맥락(앞 캐릭터 말을 포함한다), 없으면 앞 캐릭터 말 한 줄.
  const context =
    request.history.length > 0
      ? `Recent conversation (context only — do not give feedback on it):\n${request.history
          .map((entry) => `${entry.role === "user" ? "Learner" : "Character"}: ${entry.text}`)
          .join("\n")}\n\n`
      : request.previous
        ? `The character just said: ${request.previous}\n`
        : "";
  return `${character}${level}${context}Latest learner message (give feedback on this only): ${request.text}`;
}

/** 구조화 출력(nullable 칸)을 계약 모양으로. kind에 맞는 본문이 없으면 `none`, l1_to_ko에는 번역만 남깁니다. */
export function feedbackFrom(result: {
  status: "ok" | "none";
  kind: "correction" | "better" | "l1_to_ko" | null;
  items: { original: string; corrected: string; reason: string }[] | null;
  better: { text: string; meaning: string; explanation: string } | null;
  l1ToKo: { text: string; meaning: string } | null;
}): Feedback {
  const none: Feedback = { status: "none" };
  if (result.status === "none" || result.kind === null) return none;
  if (result.kind === "l1_to_ko")
    return result.l1ToKo === null
      ? none
      : { status: "ok", kind: "l1_to_ko", l1ToKo: result.l1ToKo };
  if (result.kind === "better" && result.better === null) return none;
  const items = result.items?.length ? result.items : null;
  if (result.kind === "correction" && items === null) return none;
  return {
    status: "ok",
    kind: result.kind,
    ...(items === null ? {} : { items }),
    ...(result.better === null ? {} : { better: result.better }),
  };
}

/** `count`는 조각 수. 문서 화면은 자리 표시 글자를 넣는다. */
export function translationSystem(l1: string, count: number | string): string {
  return `Translate a Korean chat character's message into the language with BCP 47 tag "${l1}". The message is a numbered list of lines; each line is "speech" (what the character says) or "action" / "narration" (stage directions). Return "lines" with exactly ${count} strings, one per input line, in the same order. Translate naturally in the character's tone, keep names, and translate stage directions as short stage directions. No romanization, notes or quotes.`;
}

export function translationContent(segments: readonly Segment[]): string {
  return segments
    .map((segment, index) => `${index + 1}. [${segment.kind}] ${segment.text}`)
    .join("\n");
}

export function memorySystem(minor: boolean): string {
  return `You maintain long-term memory for a chat character. From the latest exchange, extract at most 3 new, durable facts about the learner (preferences, plans, life events) worth remembering in later conversations. Write each in short Korean.
- "shared": true if any character could know it (name, home country, hobbies, level), false if it only belongs to this conversation.
- Skip anything already in the existing memory, small talk, and anything about the character.
${minor ? "- The learner may be a minor: never store health, mental health, or emotional-state information.\n" : ""}- If nothing is worth remembering, return an empty list.`;
}

export const summarySystem =
  "Summarize this Korean-learning chat for the character's memory in at most 6 short Korean sentences: what the learner shared, ongoing topics, and anything promised. Merge with the previous summary. No preamble.";
