// 답할 문장 추천(보기 판) 이벤트의 순수 조각입니다(ADR-0194). 던지지 않습니다. 추천 문장 내용은 이벤트에 싣지 않습니다 —
// 묶음 키(`suggestionsKeyOf`)는 같은 묶음을 두 번 세지 않으려고 기기 안에서만 씁니다.

import type {
  ChatSuggestionEvent,
  MyMessageNumber,
} from "../../lib/chat-suggestion-event.contract";
import type { ChatIdeasOrigin, ChatMessage, ChatReplyIdea } from "./chat-source.contract";

type WithoutDays<T> = T extends unknown ? Omit<T, "daysSinceFirstOpen"> : never;
export type ChatSuggestionEventInput = WithoutDays<ChatSuggestionEvent>;

/** 지금 보내면 몇 번째 내 글이 되는지 — 로그의 내 텍스트 글 수 + 1, 4부터는 `4+`. */
export function myMessageNumberOf(messages: readonly ChatMessage[]): MyMessageNumber {
  let mine = 0;
  for (const message of messages) if (message.kind === "text" && message.from === "me") mine += 1;
  return mine >= 3 ? "4+" : mine === 2 ? "3" : mine === 1 ? "2" : "1";
}

/** 묶음을 가리는 키 — 같은 글 묶음이면 같습니다. 빈 묶음은 빈 문자열. */
export function suggestionsKeyOf(ideas: readonly ChatReplyIdea[]): string {
  return ideas.map((idea) => idea.ko).join("\n");
}

/** 서버 메시지의 `origin` 값 → 추천 출처. 그 밖의 값(crisis · 없음)은 null. */
export function suggestionOriginOf(raw: unknown): ChatIdeasOrigin | null {
  return raw === "greeting" || raw === "turn" || raw === "proactive" ? raw : null;
}

export type SuggestionEventRoom = {
  readonly characterId: string;
  readonly ideas: readonly ChatReplyIdea[];
  readonly ideasOrigin?: ChatIdeasOrigin;
  readonly messages: readonly ChatMessage[];
};

/** 보임(`index` 없음) · 누름(`index` 있음) 이벤트의 모양입니다. */
export function suggestionEventOf(
  room: SuggestionEventRoom,
  index?: number,
): ChatSuggestionEventInput {
  const common = {
    surface: "chat",
    characterId: room.characterId,
    count: String(room.ideas.length),
    replyOrigin: room.ideasOrigin ?? "unknown",
    myMessageNumber: myMessageNumberOf(room.messages),
  } as const;
  return index === undefined
    ? { name: "chat_suggestion_shown", ...common }
    : { name: "chat_suggestion_tapped", ...common, index: String(index) };
}
