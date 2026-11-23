// 채팅 단어(ADR-0170) — 서버 교정 카드의 `chatWords`를 앱 모양으로 풀고, 내 글 노트에 붙입니다. 순수.
// 교정 카드가 `ok`가 아니어도(고칠 것이 없는 글) 단어는 셀 수 있어 카드 해석(`correctionOf`)과 따로 읽습니다.

import type { ChatWord, ChatWordsResult } from "./chat-feedback.contract";
import type { ChatMyNotes } from "./chat-source.contract";
import { NO_NOTES } from "./chat-source.contract";

type Json = Record<string, unknown>;

const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;

function wordsOf(raw: unknown): readonly ChatWord[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const word = recordOf(item);
    return typeof word?.id === "string" && typeof word.surface === "string" && word.surface !== ""
      ? [{ id: word.id, surface: word.surface }]
      : [];
  });
}

/** 카드(또는 SSE `correction` 본문)의 `chatWords` — 없거나 틀리면 null. 둘 다 비면 null. */
export function chatWordsOf(raw: unknown): ChatWordsResult | null {
  const words = recordOf(recordOf(raw)?.chatWords);
  const weekTotal = words?.weekTotal;
  if (typeof weekTotal !== "number" || !Number.isInteger(weekTotal) || weekTotal < 0) return null;
  const counted = wordsOf(words?.counted);
  const pending = wordsOf(words?.pending);
  return counted.length === 0 && pending.length === 0 ? null : { counted, pending, weekTotal };
}

/** 내 글 노트에 채팅 단어를 붙입니다. */
export function withChatWords(
  notes: Readonly<Record<string, ChatMyNotes>>,
  messageId: string,
  result: ChatWordsResult,
): Readonly<Record<string, ChatMyNotes>> {
  return { ...notes, [messageId]: { ...(notes[messageId] ?? NO_NOTES), chatWords: result } };
}

/** 서버 기록의 내 글마다 저장 카드(`feedback`)의 채팅 단어 — 숨김 · 실패 글은 뺍니다. */
export function historyChatWordsOf(
  messages: readonly unknown[],
): Readonly<Record<string, ChatWordsResult>> {
  const found: Record<string, ChatWordsResult> = {};
  for (const item of messages) {
    const message = recordOf(item);
    if (message?.role !== "user" || message.hidden === true || message.status === "failed")
      continue;
    const result = chatWordsOf(message.feedback);
    if (typeof message.id === "string" && result !== null) found[message.id] = result;
  }
  return found;
}
