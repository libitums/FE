// 「새 메시지 ↓」 알약의 순수 규칙 — 어떤 줄을 세는지 · 떠나 있는 동안 온 줄 · 무엇을 세울지.
// 상대가 보낸 것(말 · 지문 · 사진 · 음성)만 셉니다 — 내 글 · 만드는 중 대기 줄 · 공지 · 위기 카드 · 매체 회색 줄은 세지 않습니다.

import type { ChatMessage } from "./chat-source.contract";
import type { PillArrival, PillMedia, PillView } from "./new-message-pill.contract";

/** 세는 줄이면 그 종류, 아니면 null. */
export function arrivalKindOf(message: ChatMessage): PillMedia | null {
  switch (message.kind) {
    case "text":
      return message.from === "them" ? "message" : null;
    case "action":
      return "message";
    case "photo":
    case "voice":
      return message.kind;
    default:
      return null;
  }
}

/** 지금 로그에 있는 세는 줄의 id — 끝을 떠나는 순간 찍어 두고 그 뒤 온 줄만 셉니다. */
export function arrivalIds(messages: readonly ChatMessage[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const message of messages) if (arrivalKindOf(message) !== null) ids.add(message.id);
  return ids;
}

/**
 * 떠나 있는 동안 처음 보인 세는 줄에 온 순서를 매깁니다 — 사진 · 음성 줄은 대상 말풍선 뒤에 끼어 서므로 로그 자리로는 늦게 온 것을
 * 알 수 없습니다. 새 것이 없으면 같은 참조를 돌려줍니다. 한 번에 여럿이면 로그 순서대로.
 */
export function noteArrivals(
  order: ReadonlyMap<string, number>,
  messages: readonly ChatMessage[],
  seen: ReadonlySet<string>,
): ReadonlyMap<string, number> {
  let next: Map<string, number> | null = null;
  for (const message of messages) {
    if (arrivalKindOf(message) === null || seen.has(message.id) || order.has(message.id)) continue;
    next ??= new Map(order);
    next.set(message.id, next.size);
  }
  return next ?? order;
}

/** 떠날 때 본 줄(`seen`) 밖의 세는 줄 — 없으면 null. 마지막 종류는 온 순서(`order`, 없으면 로그 순서)로 정합니다. */
export function arrivalsSince(
  messages: readonly ChatMessage[],
  seen: ReadonlySet<string>,
  order: ReadonlyMap<string, number> = new Map(),
): PillArrival | null {
  let count = 0;
  let latest: PillMedia = "message";
  let latestRank = -1;
  messages.forEach((message, index) => {
    const kind = arrivalKindOf(message);
    if (kind === null || seen.has(message.id)) return;
    count += 1;
    // 순서를 아직 못 매긴 줄은 이미 매긴 것보다 늦게 온 것으로 봅니다(같은 렌더에 막 선 줄).
    const rank = order.get(message.id) ?? order.size + index;
    if (rank >= latestRank) {
      latestRank = rank;
      latest = kind;
    }
  });
  return count === 0 ? null : { count, latest };
}

/** 끝 근처면 없음, 떠나 있는 동안 온 줄이 있으면 알약, 없고 한 화면 넘게 멀면 ↓ 단추. */
export function pillViewOf(input: {
  readonly nearEnd: boolean;
  readonly far: boolean;
  readonly arrival: PillArrival | null;
}): PillView {
  if (input.nearEnd) return null;
  if (input.arrival !== null) return { kind: "pill", arrival: input.arrival };
  return input.far ? { kind: "latest" } : null;
}
