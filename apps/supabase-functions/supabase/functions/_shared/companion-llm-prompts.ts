// 피드백 · 번역 프롬프트와 받은 결과 다듬기. 벤더와 무관한 글이라 `companion-llm.ts`(Anthropic 호출)에서 떼어 둡니다.
// `companion-eval`이 같은 `feedback()` · `translate()`를 부르므로 여기를 고치면 평가 결과도 함께 바뀝니다.

import type {
  Feedback,
  FeedbackHistoryEntry,
  FeedbackItem,
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
      return `The relationship is polite (존댓말) and this character expects 존댓말 from learners. If the learner speaks in 반말, use kind "correction": "corrected" in polite style, one item per 반말 ending.`;
    return `The relationship is still polite (존댓말). If the learner speaks in 반말 throughout, use kind "better" (not a correction): "corrected" is the same message in polite style, with one item per changed ending.`;
  }
  if (request.speechLevel === "casual" || request.speechLevel === "slang")
    return `The relationship is casual, so 반말 is fine. ${elder} 존댓말 is always acceptable — never give feedback on it.`;
  return `The relationship's speech level is unknown: give no feedback on choosing 존댓말 or 반말 (mixing inside one message is still a mistake). ${elder}`;
}

export function feedbackSystem(request: FeedbackRequest): string {
  const language = request.l1 ?? "en";
  return `You give feedback on one chat message a Korean learner sent to a chat character. Write reasons, explanations and meanings in the language with BCP 47 tag "${language}". Too much feedback tires learners: give only what clearly helps, and when unsure return status "none".

The recent conversation, if given, is context only: give feedback on the latest learner message only — never on earlier messages or on the character's lines.
Text between asterisks (e.g. *웃으며*, *배고프다…*) is the learner's action or inner thought in the roleplay, not speech. Check the Korean inside it for mistakes too, but never judge its speech level (반말 is normal there), and keep the asterisks in "corrected".

The app shows one card in this order, so fill these fields:
- "corrected": the learner's whole message as one correct, natural Korean text with ALL fixes applied (for kind "better", the better whole message). Only the Korean text — no quotes, labels or notes.
- "items": one entry per problem: "original" (the learner's expression), "corrected" (the fixed expression), and "reason" — the rule in one plain, short sentence (e.g. "이에요 attaches directly to the noun."). One message can have several problems: list every distinct problem as its own item — do not merge them and do not drop any. Empty for kind "l1_to_ko".
- "better": an extra, different natural way to say it — only when clearly useful, otherwise null. "text" in Korean, "meaning" its meaning, "explanation" one plain sentence.
- "meaning": the meaning of "corrected". Required for kind "l1_to_ko", otherwise only when helpful.

Decide in this order and use exactly one kind:
1. Non-Korean parts. If any part of the message is not Korean (the whole message, or some words or a clause in another language), use kind "l1_to_ko": "corrected" is the whole message as natural Korean — keep the learner's Korean parts, put the rest into Korean, and silently fix any Korean mistakes in it — and "meaning" is its meaning. Leave "items" empty and "better" null. Never explain why it should be in Korean and never comment on the choice of language. Names, brands and acronyms usually written in Latin letters (BTS, iPhone, K-pop), numbers and emoji are not non-Korean parts.
2. Mistakes. Use kind "correction" for grammar, particles, conjugation, spelling and typos, wrong words, and speech levels mixed inside one message (e.g. "안녕하세요! 뭐 해?" — make the whole message one level, matching the relationship). Spacing only when it changes the meaning or makes the sentence hard to read; ignore ordinary chat spacing slips.
3. Speech level. ${speechLevelRule(request)}
4. Profanity. If the message uses swear words or vulgar slang that are not aimed at anyone (e.g. "아 씨 시험 망했어", ㅅㅂ, 존나), use kind "better": "corrected" says the same thing without the vulgar word, and one item whose reason says plainly that the word is 비속어 (vulgar) and gives the neutral form. Recognize disguised spellings (ㅅㅂ, 시1발, ㅂㅅ, f*ck). Mild teasing words such as 바보, 멍청이 or 바보야 are not 비속어 — never flag them as profanity.
5. Naturalness. Use kind "better" only when the sentence is clearly unnatural or translationese to a native speaker (e.g. pronoun overuse like "나는 너를 좋아해요", word-for-word calques): one suggestion as "corrected", with one item explaining it. Never suggest alternatives for a sentence that is already natural.
6. Otherwise use status "none" with "corrected", "better" and "meaning" null and "items" empty.

Never give feedback on chat conventions: ㅋㅋ, ㅎㅎ, ㅇㅇ, ~ endings, emoji, missing punctuation, or casual style natives use.
Reasons and explanations state the rule plainly. No comments about the learner, the character or the conversation.`;
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

/** 고칠 것 없음 · 받지 못함 카드. */
export const emptyFeedback = (status: "none" | "unavailable", original: string): Feedback => ({
  status,
  kind: null,
  original,
  corrected: null,
  items: [],
  better: null,
  meaning: null,
});

/** 모델이 낸 카드(학습자 메시지 `original`은 서버가 채운다). */
export type FeedbackDraft = {
  status: "ok" | "none";
  kind: "correction" | "better" | "l1_to_ko" | null;
  corrected: string | null;
  items: FeedbackItem[];
  better: { text: string; meaning: string; explanation: string } | null;
  meaning: string | null;
};

/** 조각 고침을 원문에 차례로 적용 — 모델이 `corrected`를 빠뜨린 교정 카드를 살린다. */
const applyItems = (original: string, items: readonly FeedbackItem[]) =>
  items.reduce((text, item) => text.replace(item.original, item.corrected), original);

/**
 * 모델 결과를 고정 카드로 다듬는다. `ok`면 `corrected`가 늘 있게(교정은 조각을 적용해서라도), `l1_to_ko`는 조각 · 덧붙임 없이,
 * 본문이 없으면 `none`. 덧붙임이 고친 문장과 같으면 뺀다.
 */
export function feedbackFrom(draft: FeedbackDraft, original: string): Feedback {
  const none = emptyFeedback("none", original);
  if (draft.status === "none" || draft.kind === null) return none;
  const corrected = draft.corrected?.trim() || null;
  const meaning = draft.meaning?.trim() || null;
  if (draft.kind === "l1_to_ko") {
    if (corrected === null) return none;
    return {
      status: "ok",
      kind: "l1_to_ko",
      original,
      corrected,
      items: [],
      better: null,
      meaning,
    };
  }
  const items = draft.items.filter(
    (item) => item.original.trim() !== "" && item.corrected !== item.original,
  );
  const fixed = corrected ?? (items.length > 0 ? applyItems(original, items) : null);
  if (fixed === null || (draft.kind === "correction" && items.length === 0)) return none;
  const better = draft.better !== null && draft.better.text.trim() !== fixed ? draft.better : null;
  return { status: "ok", kind: draft.kind, original, corrected: fixed, items, better, meaning };
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
