// 목록 정렬 · 미리보기 · 안 읽은 수 · 시간입니다(messenger-chat-ui spec §5.6).

import type { ChatMessage, ChatRoomSummary, ChatText } from "./chat-source.contract";
import { COMPANION_ROSTER } from "./companion-roster";

export type ChatRowPreview =
  | {
      readonly kind: "activity";
      readonly activity: "typing" | "sending-photo" | "recording-voice";
    }
  | { readonly kind: "locked"; readonly unlockEpisode: number }
  | { readonly kind: "text"; readonly from: "me" | "them"; readonly text: ChatText }
  | { readonly kind: "photo" }
  | { readonly kind: "voice"; readonly durationMs: number }
  /** 아직 메시지가 없는 열린 방 — 그 인물의 첫 인사(방을 열면 실제로 오는 말)를 흐리게 미리 보입니다. */
  | { readonly kind: "greeting"; readonly text: string }
  | { readonly kind: "empty" };

export type ChatTime =
  | { readonly kind: "now" }
  | { readonly kind: "today"; readonly hours: number; readonly minutes: number }
  | { readonly kind: "yesterday" }
  | { readonly kind: "weekday"; readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { readonly kind: "date"; readonly month: number; readonly day: number };

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * 목록에 서는 방 — 열린 방만, 최근 갱신 순. 잠긴 방은 미리 보이지 않고 해금되면 생깁니다(사용자 결정 2026-11-13). 같은 값은
 * 입력 순서(안정)입니다.
 */
export function orderChatRooms(rooms: readonly ChatRoomSummary[]): readonly ChatRoomSummary[] {
  // Array.prototype.sort는 안정 정렬입니다.
  return rooms
    .filter((room) => room.access.kind === "open")
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * NEW 줄: 열린 방이고, 방금 해금돼 아직 열어 보지 않았거나(isNew) 메시지가 아직 없어 첫 인사를 미리 보이는 방(ADR-0113 추가
 * 2026-11-17). 안 읽은 수 · 탭 NEW(`messenger-guide`)는 isNew만 봅니다 — 첫 인사 줄은 세지 않습니다.
 */
export function newBadgeShown(
  room: ChatRoomSummary,
  preview: ChatRowPreview = chatRowPreview(room),
): boolean {
  if (room.access.kind !== "open") return false;
  return room.isNew || preview.kind === "greeting";
}

/**
 * 목록 한 줄이 미리보기 · 시각으로 쓰는 줄 — 보통 마지막 줄입니다. 맨 끝이 사진 · 음성 안내 줄(`media-notice` — 「이번 것은 무료」,
 * 엽전 부족 등)이면 그 앞의 줄을 씁니다: 그 줄은 대화가 아니라 단추를 누른 결과 안내라, 받은 음성 · 사진이 빈 줄로 가려지지 않게.
 * 다른 회색 줄(전송 실패 `notice` · 위기 안내 `crisis`)은 건너뛰지 않습니다 — 보내지 못한 글이나 위기 안내를 부른 글이 목록에
 * 드러나면 안 됩니다(ADR-0125). 사진 · 음성 안내 줄뿐이면 마지막 줄 그대로(빈 미리보기).
 */
export function lastPreviewLine(messages: readonly ChatMessage[]): ChatMessage | null {
  const last = messages[messages.length - 1] ?? null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const line = messages[i] as ChatMessage;
    if (line.kind !== "media-notice") return line;
  }
  return last;
}

const firstLineOf = (characterId: string): string | null =>
  COMPANION_ROSTER.find((character) => character.id === characterId)?.firstLine ?? null;

/** 잠김 > 활동 > 마지막 메시지 > 비어 있음 순으로 한 줄 미리보기를 고릅니다. */
export function chatRowPreview(room: ChatRoomSummary): ChatRowPreview {
  if (room.access.kind === "locked") {
    return { kind: "locked", unlockEpisode: room.access.unlockEpisode };
  }
  if (room.activity !== "idle") return { kind: "activity", activity: room.activity };
  const last = room.lastMessage;
  if (last === null) {
    const greeting = firstLineOf(room.counterpart.id);
    return greeting === null ? { kind: "empty" } : { kind: "greeting", text: greeting };
  }
  switch (last.kind) {
    case "text":
      return { kind: "text", from: last.from, text: last.text };
    case "action":
      return { kind: "text", from: "them", text: last.text };
    case "photo":
      return { kind: "photo" };
    case "voice":
      return { kind: "voice", durationMs: last.durationMs };
    case "photo-pending":
    case "voice-pending":
    // 고지 · 위기 안내는 상대가 한 말이 아니라 목록 미리보기에 싣지 않습니다(ADR-0125).
    case "notice":
    case "media-notice":
    case "crisis":
      return { kind: "empty" };
    default: {
      const unreachable: never = last;
      return unreachable;
    }
  }
}

/** 1~99는 그대로, 100 이상은 "99+", 0 이하 · NaN은 알약이 없습니다. */
export function unreadBadge(count: number): string | null {
  if (!(count > 0)) return null;
  return count >= 100 ? "99+" : String(Math.floor(count));
}

const dayNumber = (date: Date): number =>
  Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

/** 기기 지역 시각 기준입니다. 60초 안(미래 포함)은 now, 같은 날 · 어제 · 2~6일 전 요일 · 그 밖 날짜. */
export function chatTimeOf(at: number, now: number): ChatTime {
  if (now - at < MINUTE_MS) return { kind: "now" };
  const date = new Date(at);
  const days = dayNumber(new Date(now)) - dayNumber(date);
  if (days <= 0) return { kind: "today", hours: date.getHours(), minutes: date.getMinutes() };
  if (days === 1) return { kind: "yesterday" };
  if (days <= 6) {
    return { kind: "weekday", weekday: date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6 };
  }
  return { kind: "date", month: date.getMonth() + 1, day: date.getDate() };
}
