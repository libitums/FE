// 내 스토리 반응(origin `story_reaction`, ADR-0191 D2)의 인용과 덕수쌤 스토리 퀴즈 `meta`(서버 반영 예상)를 기록 메시지에서 풉니다. 순수 ·
// 던지지 않음 — `companion-parse.ts`의 기록 풀기가 부릅니다.

import type { ChatMessage } from "./chat-source.contract";
import { storyQuoteOf } from "./friend-stories-parse";
import type { ChatQuizMark } from "./my-stories.contract";

type Json = Record<string, unknown>;
const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
const stringOf = (value: unknown): string | null => (typeof value === "string" ? value : null);

/**
 * 덕수쌤 스토리 퀴즈 표시 — **서버 반영 예상**(ADR-0194 적용 기록 「서버에 요청하는 모양」). 기록 메시지의 `meta`(공개 칸만)에서:
 * - 인물 메시지 `meta.angle === "quiz"`(origin `story_reaction`) → ask.
 * - 내 메시지 `meta.quiz = { free: true, attempt: 1 | 2, result?: "correct" | "hint" | "revealed" }` → answer(모르는 result는 null).
 * - 인물 메시지 `meta.quiz = { gift: { word } }` → gift(이 메시지를 대상으로 한 음성이 선물).
 * 칸이 없거나 틀리면 null — 지금 서버에서는 퀴즈 표시가 없습니다.
 */
export function quizMarkOf(role: unknown, meta: unknown): ChatQuizMark | null {
  const record = recordOf(meta);
  if (record === null) return null;
  const quiz = recordOf(record.quiz);
  if (role === "user") {
    const attempt = quiz?.attempt;
    if (quiz?.free !== true || (attempt !== 1 && attempt !== 2)) return null;
    const result = quiz.result;
    return {
      kind: "answer",
      attempt,
      result: result === "correct" || result === "hint" || result === "revealed" ? result : null,
    };
  }
  if (role !== "assistant") return null;
  const word = stringOf(recordOf(quiz?.gift)?.word);
  if (word !== null && word !== "") return { kind: "gift", word };
  return record.angle === "quiz" ? { kind: "ask" } : null;
}

/** 인물 메시지의 첫 말풍선에 내 스토리 인용(origin `story_reaction`) · 퀴즈 표시를 얹습니다. */
export function withReactionMarks(
  bubbles: readonly ChatMessage[],
  story: unknown,
  quiz: ChatQuizMark | null,
): readonly ChatMessage[] {
  const [first, ...rest] = bubbles;
  if (first?.kind !== "text") return bubbles;
  const quote = storyQuoteOf(story);
  if (quote.story === undefined && quiz === null) return bubbles;
  return [{ ...first, ...quote, ...(quiz === null ? {} : { quiz }) }, ...rest];
}

/** 내 글에 퀴즈 답 표시를 얹습니다(`meta.quiz`). 없으면 그대로. */
export function withQuizAnswer(line: ChatMessage, meta: unknown): ChatMessage {
  const quiz = quizMarkOf("user", meta);
  return quiz === null || line.kind !== "text" ? line : { ...line, quiz };
}

/** 인물 메시지의 말풍선들 — 내 스토리 반응(origin `story_reaction`)이면 첫 말풍선에 인용, `meta`에 퀴즈 표시가 있으면 함께. */
export function reactionLinesOf(
  bubbles: readonly ChatMessage[],
  record: Readonly<Record<string, unknown>>,
): readonly ChatMessage[] {
  const reaction = record["origin"] === "story_reaction";
  if (!reaction && record["meta"] === undefined) return bubbles;
  return withReactionMarks(
    bubbles,
    reaction ? record["story"] : null,
    quizMarkOf("assistant", record["meta"]),
  );
}
