// 목록 정렬 · 미리보기 · 안 읽은 수 · 시간입니다(messenger-chat-ui spec §5.6).

import type { ChatRoomSummary, ChatText } from "./chat-source.contract";

export type ChatRowPreview =
  | {
      readonly kind: "activity";
      readonly activity: "typing" | "sending-photo" | "recording-voice";
    }
  | { readonly kind: "locked"; readonly unlockEpisode: number }
  | { readonly kind: "text"; readonly from: "me" | "them"; readonly text: ChatText }
  | { readonly kind: "photo" }
  | { readonly kind: "voice"; readonly durationMs: number }
  | { readonly kind: "empty" };

export type ChatTime =
  | { readonly kind: "now" }
  | { readonly kind: "today"; readonly hours: number; readonly minutes: number }
  | { readonly kind: "yesterday" }
  | { readonly kind: "weekday"; readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { readonly kind: "date"; readonly month: number; readonly day: number };

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** 열린 방은 최근 갱신 순, 잠긴 방은 그 뒤(입력 순서). 같은 값은 입력 순서(안정)입니다. */
export function orderChatRooms(rooms: readonly ChatRoomSummary[]): readonly ChatRoomSummary[] {
  const open = rooms.filter((room) => room.access.kind === "open");
  const lockedRooms = rooms.filter((room) => room.access.kind !== "open");
  // Array.prototype.sort는 안정 정렬입니다.
  return [...open.sort((a, b) => b.updatedAt - a.updatedAt), ...lockedRooms];
}

/** NEW 줄: isNew이고 열린 방일 때만. */
export function newBadgeShown(room: ChatRoomSummary): boolean {
  return room.isNew && room.access.kind === "open";
}

/** 잠김 > 활동 > 마지막 메시지 > 비어 있음 순으로 한 줄 미리보기를 고릅니다. */
export function chatRowPreview(room: ChatRoomSummary): ChatRowPreview {
  if (room.access.kind === "locked") {
    return { kind: "locked", unlockEpisode: room.access.unlockEpisode };
  }
  if (room.activity !== "idle") return { kind: "activity", activity: room.activity };
  const last = room.lastMessage;
  if (last === null) return { kind: "empty" };
  switch (last.kind) {
    case "text":
      return { kind: "text", from: last.from, text: last.text };
    case "photo":
      return { kind: "photo" };
    case "voice":
      return { kind: "voice", durationMs: last.durationMs };
    case "photo-pending":
    case "voice-pending":
    // 고지 · 위기 안내는 상대가 한 말이 아니라 목록 미리보기에 싣지 않습니다(ADR-0125).
    case "notice":
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
