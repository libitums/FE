// 알림 권한 카드(ADR-0197 D1)의 「이번 입장에서 보낸 말에 인물이 처음 답했다」 판정입니다. 순수.
//
// 「보낸 말」은 한 번의 갱신에 내 글 하나만 새로 선 경우입니다 — 기록을 불러오며 여러 줄이 한꺼번에 서는 것 · 첫 인사는 아닙니다.
// 「답」은 그 뒤 새로 선 인물의 글 말풍선이고, 방이 답을 기다리지 않을 때(서버 답은 조각마다 자라므로 턴이 끝난 뒤) 도착으로 봅니다.

import type { ChatMessage } from "./chat-source.contract";

/** 지금까지 본 줄 id · 이번 입장에서 말을 보냈는지 · 그 뒤 인물의 글이 섰는지. */
export type ReplyWatch = {
  readonly known: ReadonlySet<string> | null;
  readonly sent: boolean;
  readonly heard: boolean;
};

export const initialReplyWatch: ReplyWatch = { known: null, sent: false, heard: false };

const isMine = (message: ChatMessage): boolean => message.kind === "text" && message.from === "me";
const isTheirText = (message: ChatMessage): boolean =>
  message.kind === "text" && message.from === "them";

/** 대화 줄이 바뀔 때마다 부릅니다. */
export function replyWatchNext(watch: ReplyWatch, messages: readonly ChatMessage[]): ReplyWatch {
  const ids = new Set(messages.map((message) => message.id));
  const known = watch.known;
  if (known === null) return { known: ids, sent: false, heard: false };
  const fresh = messages.filter((message) => !known.has(message.id));
  if (fresh.length === 0) return { known: ids, sent: watch.sent, heard: watch.heard };
  const only = fresh.length === 1 ? fresh[0] : undefined;
  const heard = watch.heard || (watch.sent && fresh.some(isTheirText));
  const sent = watch.sent || (only !== undefined && isMine(only));
  return { known: ids, sent, heard };
}

/** 답이 다 도착했는가 — 보낸 뒤 인물의 글이 섰고 방이 답을 기다리지 않음. */
export function replyArrived(watch: ReplyWatch, busy: boolean): boolean {
  return watch.sent && watch.heard && !busy;
}
