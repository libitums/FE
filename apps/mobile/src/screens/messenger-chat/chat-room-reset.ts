// 방 지우기 · 대화 비우기(ADR-0156)입니다 — `chat-fixture-source.ts`가 부르는 조각. 던지지 않습니다.
// - 대화 비우기(Clear chat): 서버 방은 `companion_clear_chat`(대화 · 그 인물 기억 · 친밀도)이 끝난 뒤 방을 빈 채로 되돌리고, 열려
//   있으면 다시 읽어(`loadRoom`) 첫 인사를 받습니다. 앱 안 방은 기기에서만 처음 모습(opening 한 줄)으로 되돌립니다. 방은 목록에 남습니다.
// - 방 지우기(`deleteRoom`): 메모리에서만 방을 뺍니다(테스트 · 옛 길).

import type { RoomState } from "./chat-fixture-room";
import type { UnreadSeen } from "./chat-last-seen";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatClearOutcome, ChatMessage } from "./chat-source.contract";

export type RoomResetDeps = {
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly clearHandles: (room: RoomState) => void;
  /** 앱 안 방의 첫 줄(씨앗 opening) — 서버 방은 쓰지 않습니다. */
  readonly openingOf: (room: RoomState) => ChatMessage | null;
  readonly remote: ChatRemote | null;
  /** 서버 방을 다시 읽습니다(기록 → 비었으면 첫 인사). */
  readonly loadRoom: ((roomId: string) => void) | undefined;
  readonly isOpen: (roomId: string) => boolean;
  /** 방을 출처에서 뺍니다(`deleteRoom`). */
  readonly forget: (roomId: string) => void;
  /** 본 마지막 인물 메시지(ADR-0213 개정) — 비운 서버 방은 빈 대화를 본 것으로 둡니다. */
  readonly seen?: UnreadSeen | null;
};

/** 방을 막 해금한 빈 모습으로 되돌립니다 — 접근(열림) · 설정 · 입력 막힘은 그대로입니다. */
export function emptyRoom(room: RoomState, opening: ChatMessage | null): void {
  room.messages = opening === null ? [] : [opening];
  room.notes = {};
  room.ratings = {};
  room.remoteHistory = "idle";
  room.remoteIdeas = null;
  room.remoteIdeasOrigin = null;
  room.remoteIdeasRef = null;
  room.greetingId = null;
  room.olderHidden = false;
  room.samples = [];
  room.unsent = [];
  room.recovery = "none";
  room.unread = 0;
  room.isNew = false;
  room.ideaIndex = 0;
  room.replyIndex = 0;
  room.typing = false;
  room.pendingReplies = 0;
  room.pendingPhotos = 0;
  room.pendingVoices = 0;
}

export function roomResetMethods(deps: RoomResetDeps) {
  const { live, changed, clearHandles, remote } = deps;
  return {
    deleteRoom: (roomId: string): void => {
      const room = live(roomId);
      if (room === null) return;
      clearHandles(room);
      deps.forget(roomId);
    },
    clearRoom: async (roomId: string): Promise<ChatClearOutcome> => {
      const room = live(roomId);
      if (room === null || room.access.kind !== "open") return "failed";
      const server = room.origin === "server" && remote !== null;
      if (server) {
        if (remote.clearChat === undefined) return "failed";
        // 답을 기다리는 동안은 비우지 않습니다 — 서버도 진행 중인 턴이 있으면 「busy」로 거절합니다.
        if (room.pendingReplies > 0) return "busy";
        // 원격 포트는 던지지 않는 계약이지만, 던져도 모달이 멈추지 않게 실패로 돌려줍니다.
        const outcome = await remote.clearChat(room.seed.counterpart.id).catch(() => null);
        if (outcome !== "cleared") return outcome ?? "failed";
        if (live(roomId) !== room) return "cleared";
      }
      clearHandles(room);
      emptyRoom(room, server ? null : deps.openingOf(room));
      if (server) deps.seen?.reset(room.seed.counterpart.id);
      changed(room);
      if (server && deps.isOpen(roomId)) deps.loadRoom?.(roomId);
      return "cleared";
    },
  };
}
