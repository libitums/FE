// 앱이 꺼진 사이 온 선톡 · 스토리 반응의 안 읽음입니다(ADR-0213 개정). 서버에는 읽음 기록이 없고 대화의 `last_message_at`은
// 메시지 `created_at`보다 이르게 찍혀 시각 비교로는 셀 수 없습니다 — 기기에 방마다 「본 마지막 인물 메시지」(id · 시각)를 두고,
// 기록을 읽을 때 그 뒤의 인물 메시지 수를 셉니다. 인물 메시지 하나의 말풍선 여럿(`id#자리`)은 하나로 셉니다(턴 하나 = 안 읽음
// 하나, ADR-0102). 내 글 · 시스템 줄(고지 · 사진 · 음성 안내 · 위기 카드)은 세지 않습니다. 숨김 메시지는 기록에 오지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import type { ChatMessage } from "./chat-source.contract";

/** 본 마지막 인물 메시지 — id는 말풍선 자리를 뗀 서버 메시지 id. `id: null`은 「빈 대화를 봤음」(그 뒤 온 것은 모두 새것). */
export type LastSeen = { readonly id: string | null; readonly at: number };

export const EMPTY_SEEN: LastSeen = { id: null, at: 0 };

/** 기기 저장 포트 — 인물 id마다 하나(계정마다 따로는 저장이 집니다). 던지지 않습니다. */
export type LastSeenStore = {
  readonly read: (characterId: string) => LastSeen | null;
  readonly write: (characterId: string, seen: LastSeen) => void;
};

/** 인물의 말 · 지문 줄이면 그 메시지 id(말풍선 자리 `#n`을 뗌), 아니면 null — 안 읽음 규칙(`theirLines`)과 같은 줄입니다. */
function characterMessageId(message: ChatMessage): string | null {
  if (!((message.kind === "text" && message.from === "them") || message.kind === "action"))
    return null;
  const cut = message.id.indexOf("#");
  return cut < 0 ? message.id : message.id.slice(0, cut);
}

/** 로그의 마지막 인물 메시지(id · 시각). 없으면 null. */
export function lastSeenOf(messages: readonly ChatMessage[]): LastSeen | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    const id = message === undefined ? null : characterMessageId(message);
    if (message !== undefined && id !== null) return { id, at: message.at };
  }
  return null;
}

/**
 * 본 것 뒤의 인물 메시지 수. 본 id가 로그(기록 첫 쪽 30개)에 없으면 본 시각보다 늦은 인물 메시지 수 — 첫 쪽 밖까지 밀려났으면
 * 첫 쪽 안의 인물 메시지 모두가 위 끝입니다(「30+」로 띄우지 않음, ADR-0213 개정 D6).
 */
export function unreadAfter(messages: readonly ChatMessage[], seen: LastSeen): number {
  const ids: string[] = [];
  const times: number[] = [];
  for (const message of messages) {
    const id = characterMessageId(message);
    if (id === null || ids[ids.length - 1] === id) continue;
    ids.push(id);
    times.push(message.at);
  }
  const index = seen.id === null ? -1 : ids.lastIndexOf(seen.id);
  if (index >= 0) return ids.length - index - 1;
  return times.filter((at) => at > seen.at).length;
}

/** 저장값 하나 — id(빈 문자열 아닌 문자열 · null)와 유한한 시각만. 틀리면 null(적힌 것 없음). */
export function parseLastSeen(raw: unknown): LastSeen | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { id, at } = raw as { id?: unknown; at?: unknown };
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  if (id === null) return { id: null, at };
  return typeof id === "string" && id !== "" ? { id, at } : null;
}

export type UnreadSeen = {
  /** 열린 방 — 마지막 인물 메시지를 본 것으로 적습니다(방에 들어가면 안 읽음 0인 자리와 같음). */
  readonly mark: (room: RoomState) => void;
  /** 기록을 읽은 닫힌 방 — 본 것 뒤 인물 메시지 수로 안 읽음을 올립니다. 적힌 것이 없으면 지금 끝을 본 것으로 둡니다(0에서 시작). */
  readonly settle: (room: RoomState) => void;
  /** 목록 요약에 대화가 없는 인물 — 적힌 것이 없으면 빈 대화를 본 것으로 둡니다(그 뒤 온 선톡은 새것). */
  readonly noConversation: (characterId: string) => void;
  /** 대화를 비웠음 — 빈 대화를 본 것으로. */
  readonly reset: (characterId: string) => void;
};

export function unreadSeen(store: LastSeenStore, isOpen: (roomId: string) => boolean): UnreadSeen {
  const characterOf = (room: RoomState) => room.seed.counterpart.id;
  const write = (characterId: string, seen: LastSeen) => {
    const old = store.read(characterId);
    if (old?.id !== seen.id || old.at !== seen.at) store.write(characterId, seen);
  };
  return {
    mark: (room) => {
      if (!isOpen(room.seed.roomId)) return;
      const last = lastSeenOf(room.messages);
      if (last !== null) write(characterOf(room), last);
    },
    settle: (room) => {
      const characterId = characterOf(room);
      const seen = store.read(characterId);
      if (seen === null) return write(characterId, lastSeenOf(room.messages) ?? EMPTY_SEEN);
      if (isOpen(room.seed.roomId)) return;
      room.unread = Math.max(room.unread, unreadAfter(room.messages, seen));
    },
    noConversation: (characterId) => {
      if (store.read(characterId) === null) write(characterId, EMPTY_SEEN);
    },
    reset: (characterId) => write(characterId, EMPTY_SEEN),
  };
}
