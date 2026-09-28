// 서사 메신저의 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다.

import type { PrologueChatMessage } from "./episode-intro.contract";

/** 상대 메시지가 오기까지의 틈(밀리초)입니다. */
export const prologueChatIncomingDelayMs = 1500;

/**
 * 지금까지 보인 메시지 수에서 다음에 할 일을 냅니다.
 *
 * - `incoming`: 다음이 상대 메시지라 잠시 뒤 저절로 옵니다.
 * - `draft`: 다음이 내 메시지라 입력창에 채워 두고 보내기를 기다립니다.
 * - `done`: 메시지가 다 나왔습니다.
 */
export type PrologueChatNext =
  | { readonly kind: "incoming" }
  | { readonly kind: "draft"; readonly message: PrologueChatMessage }
  | { readonly kind: "done" };

export function prologueChatNext(
  messages: readonly PrologueChatMessage[],
  shownCount: number,
): PrologueChatNext {
  const next = messages[Math.max(0, shownCount)];
  if (next === undefined) {
    return { kind: "done" };
  }
  return next.sender === "self" ? { kind: "draft", message: next } : { kind: "incoming" };
}
