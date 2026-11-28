// 칩을 탭해 보낸 글의 표시(ADR-0210 D1 「앱 인계」) — chat-send 요청의 `suggestion: { message_id, index }`. 순수 · 던지지 않음.
// `message_id`는 칩이 묶인 캐릭터 메시지, `index`는 서버가 맞춰 보는 칩 셋(`latestSuggestionSet.items`, 글이 문자열인 칩만)의 자리다.
// 앱은 빈 칩을 버려(`ideasOf`) 보기의 자리와 서버 자리가 다를 수 있어, 보기마다 서버 자리를 따로 들고 있다. 칩 해석은 여기 한 곳이다.

import type { ChatReplyIdea } from "./chat-source.contract";

/** 서버 추천 답변이 묶인 캐릭터 메시지와, 보기(`ideasOf` 결과)마다의 서버 자리. */
export type ChatIdeasRef = { readonly messageId: string; readonly indexes: readonly number[] };
/** 턴 요청에 싣는 표시 — 요청 몸에서는 `suggestion: { message_id, index }`. */
export type ChatSuggestionTag = { readonly messageId: string; readonly index: number };

// 서버 계약은 `message_id: z.uuid()` · `index` 0 ~ 2 — 벗어나면 요청 전체가 400이라 싣지 않는다.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_INDEX = 2;

const textOf = (item: unknown): unknown =>
  typeof item === "object" && item !== null ? (item as Record<string, unknown>).text : null;

/** 서버 칩(`items`) → 보기. 글이 없거나 빈 칩은 버립니다. 배열이 아니면 null. */
export function ideasOf(raw: unknown): readonly ChatReplyIdea[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((item) => {
    const text = textOf(item);
    if (typeof text !== "string" || text.trim() === "") return [];
    const meaning = (item as Record<string, unknown>).meaning;
    return [{ ko: text, roman: "", en: typeof meaning === "string" ? meaning : "" }];
  });
}

/** `ideasOf(raw)`와 같은 칩을 같은 순서로 — 각 보기의 서버 자리. 메시지 id가 UUID가 아니거나 보기가 없으면 null. */
export function ideasRefOf(
  messageId: string | null | undefined,
  raw: unknown,
): ChatIdeasRef | null {
  if (typeof messageId !== "string" || !UUID.test(messageId) || !Array.isArray(raw)) return null;
  const indexes: number[] = [];
  let index = 0;
  for (const item of raw) {
    const text = textOf(item);
    if (typeof text !== "string") continue;
    if (text.trim() !== "") indexes.push(index);
    index += 1;
  }
  return indexes.length === 0 ? null : { messageId, indexes };
}

/** 응답 모양에 펼쳐 넣는 칸 — 자리를 모르면 칸이 없습니다. */
export function ideasRefField(
  messageId: string | null | undefined,
  raw: unknown,
): { readonly ideasRef?: ChatIdeasRef } {
  const ideasRef = ideasRefOf(messageId, raw);
  return ideasRef === null ? {} : { ideasRef };
}

/**
 * 보기 `ideaIndex`를 탭해 보낸 글 `text`의 표시. 보기가 그 글 그대로이고 서버 자리를 알 때만 — 아니면 undefined(표시 없이 보내면
 * 서버가 글로 칩을 가린다, ADR-0210 D1).
 */
export function suggestionTagOf(
  room: {
    readonly remoteIdeas: readonly ChatReplyIdea[] | null;
    readonly remoteIdeasRef: ChatIdeasRef | null;
  },
  ideaIndex: number | undefined,
  text: string,
): ChatSuggestionTag | undefined {
  const { remoteIdeas: ideas, remoteIdeasRef: ref } = room;
  if (ideas === null || ref === null || ideaIndex === undefined) return undefined;
  const idea = ideas[ideaIndex];
  const index = ref.indexes[ideaIndex];
  if (idea === undefined || index === undefined || index > MAX_INDEX) return undefined;
  if (idea.ko.trim() !== text.trim()) return undefined;
  return { messageId: ref.messageId, index };
}
