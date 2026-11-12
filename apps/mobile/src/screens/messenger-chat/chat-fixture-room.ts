// 가짜 출처의 방 하나 상태입니다(chat-fixture-source가 쓰는 내부 조각).

import type {
  ChatFixtureRoom,
  ChatInputBlock,
  ChatMessage,
  ChatMyNotes,
  ChatRoomAccess,
  ChatReplyIdea,
  ChatRating,
  ChatRoomActivity,
  ChatRoomSettings,
  ChatRoomSummary,
  ChatThread,
  ChatTimers,
} from "./chat-source.contract";

export type RoomState = {
  readonly seed: ChatFixtureRoom;
  /** 해금으로 바뀐다(씨앗은 처음 값). */
  access: ChatRoomAccess;
  /** 방금 해금돼 아직 열어 보지 않음(목록 NEW 줄). */
  isNew: boolean;
  /** 내 텍스트 글 id만 키. */
  notes: Readonly<Record<string, ChatMyNotes>>;
  /** 캐릭터 글 id만 키 — 내가 남긴 평가(ADR-0129). */
  ratings: Readonly<Record<string, ChatRating>>;
  messages: ChatMessage[];
  /** 씨앗이 정한 입력 막힘입니다(시각은 만들 때 풀어 둡니다). */
  readonly inputBlock: ChatInputBlock | null;
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

export function newRoomState(
  seed: ChatFixtureRoom,
  messages: ChatMessage[],
  inputBlock: ChatInputBlock | null = null,
): RoomState {
  return {
    seed,
    access: seed.access,
    isNew: false,
    notes: {},
    ratings: {},
    messages,
    inputBlock,
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

export const isOpenAccess = (room: RoomState): boolean => room.access.kind === "open";

export function ideasOf(room: RoomState): readonly ChatReplyIdea[] {
  const sets = room.seed.ideaSets;
  return sets[room.ideaIndex % Math.max(sets.length, 1)] ?? [];
}

export function advanceIdeas(room: RoomState): void {
  const count = room.seed.ideaSets.length;
  if (count > 0) room.ideaIndex = (room.ideaIndex + 1) % count;
}

export function replaceMessage(room: RoomState, id: string, next: ChatMessage): void {
  room.messages = room.messages.map((message) => (message.id === id ? next : message));
}

/** 그 방에 걸린 타이머를 모두 풉니다. */
export function clearRoomHandles(room: RoomState, timers: ChatTimers): void {
  for (const handle of room.handles) timers.clearTimeout(handle);
  room.handles.clear();
}

/** 잠긴 방을 연다. opening이 있으면 로그에 놓고(새 해금이고 닫힌 방이면 안 읽음 1), 새 해금이면 NEW 표시를 단다. */
export function openLockedRoom(
  room: RoomState,
  opening: ChatMessage | null,
  fresh: { readonly isNew: boolean; readonly unread: boolean },
): void {
  room.access = { kind: "open" };
  room.messages = opening === null ? [] : [opening];
  room.unread = opening !== null && fresh.unread ? 1 : 0;
  room.isNew = fresh.isNew;
}

export function summaryOf(
  room: RoomState,
  resolveUrl: (path: string | null) => string | null,
): ChatRoomSummary {
  if (room.summaryCache === null) {
    const last = room.messages[room.messages.length - 1] ?? null;
    room.summaryCache = {
      roomId: room.seed.roomId,
      counterpart: {
        id: room.seed.counterpart.id,
        name: room.seed.counterpart.name,
        avatarUrl: resolveUrl(room.seed.counterpart.avatarPath),
      },
      access: room.access,
      lastMessage: last,
      unread: room.unread,
      activity: activityOf(room),
      updatedAt: last === null ? 0 : last.at,
      isNew: room.isNew,
    };
  }
  return room.summaryCache;
}

export function threadOf(
  room: RoomState,
  resolveUrl: (path: string | null) => string | null,
  /** 계정의 추천 답변 설정(ADR-0126) — 꺼지면 보기가 빈다. */
  replyIdeas = true,
): ChatThread {
  if (room.threadCache === null) {
    room.threadCache = {
      roomId: room.seed.roomId,
      counterpart: summaryOf(room, resolveUrl).counterpart,
      messages: room.messages,
      typing: room.typing,
      awaitingReply: room.pendingReplies > 0,
      ideas: replyIdeas ? ideasOf(room) : [],
      settings: room.settings,
      storyPoints: room.seed.storyPoints,
      notes: room.notes,
      ratings: room.ratings,
      inputBlock: room.inputBlock,
    };
  }
  return room.threadCache;
}
