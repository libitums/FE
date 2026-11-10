// 가짜 출처의 방 하나 상태입니다(chat-fixture-source가 쓰는 내부 조각).

import type {
  ChatFixtureRoom,
  ChatMessage,
  ChatRoomActivity,
  ChatRoomSettings,
  ChatRoomSummary,
  ChatThread,
  ChatTimers,
} from "./chat-source.contract";

export type RoomState = {
  readonly seed: ChatFixtureRoom;
  messages: ChatMessage[];
  unread: number;
  settings: ChatRoomSettings;
  ideaIndex: number;
  replyIndex: number;
  typing: boolean;
  pendingReplies: number;
  pendingPhotos: number;
  pendingVoices: number;
  handles: Set<unknown>;
  summaryCache: ChatRoomSummary | null;
  threadCache: ChatThread | null;
};

export const MINUTE_MS = 60_000;

// 맨 식별자로 부릅니다 — Lynx 배경 스레드는 `setTimeout`을 전역 속성이 아니라 맨 식별자로 주입해 `globalThis.setTimeout`이
// 기기에서 없습니다(device-findings-1 D5 · D6, lib/posthog-client.ts의 `globalThis.fetch` 관찰과 같은 환경 차이).
export const defaultTimers: ChatTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function activityOf(room: RoomState): ChatRoomActivity {
  if (room.pendingPhotos > 0) return "sending-photo";
  if (room.pendingVoices > 0) return "recording-voice";
  if (room.typing) return "typing";
  return "idle";
}

export function newRoomState(seed: ChatFixtureRoom, messages: ChatMessage[]): RoomState {
  return {
    seed,
    messages,
    unread: seed.unread,
    settings: { ...seed.settings },
    ideaIndex: 0,
    replyIndex: 0,
    typing: false,
    pendingReplies: 0,
    pendingPhotos: 0,
    pendingVoices: 0,
    handles: new Set(),
    summaryCache: null,
    threadCache: null,
  };
}
