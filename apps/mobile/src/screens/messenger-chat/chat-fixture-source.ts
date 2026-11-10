// 가짜 대화 출처입니다(messenger-chat-ui spec §5.1). 씨앗에서 시작해 정해 둔 답장 · 미디어 도착을
// 주입한 타이머로 흉내 냅니다. 어떤 호출도 던지지 않습니다.

import { chatFixtureSeed } from "./chat-fixture";
import {
  activityOf,
  defaultTimers,
  MINUTE_MS,
  newRoomState,
  type RoomState,
} from "./chat-fixture-room";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type {
  ChatFixtureMessage,
  ChatMediaKind,
  ChatMessage,
  ChatRoomSummary,
  ChatSnapshot,
  ChatSource,
  ChatThread,
  FixtureChatSourceOptions,
} from "./chat-source.contract";

/** 가짜 출처만의 덧붙임입니다(공용 계약 밖). 그림 주소를 최신 해석기로 다시 풀게 캐시를 비웁니다 — 결선이 렌더 중에 부르므로
 * 알리지 않고, 화면은 다시 그릴 때 `snapshot()` · `thread()`를 새로 읽습니다. */
export type FixtureChatSource = ChatSource & { readonly refreshImages: () => void };

export function createFixtureChatSource(options: FixtureChatSourceOptions): FixtureChatSource {
  const seed = options.seed ?? chatFixtureSeed;
  const now = options.now ?? Date.now;
  const timers = options.timers ?? defaultTimers;
  const { imageUrlOf } = options;
  const timing = CHAT_PLACEHOLDERS.timing;

  const listeners = new Set<() => void>();
  let disposed = false;
  let openRoomId: string | null = null;
  let nextMessageNumber = 1;
  let snapshotCache: ChatSnapshot | null = null;

  const messageId = () => `fx-${nextMessageNumber++}`;
  const photoPaths = new Map<string, string | null>(); // 사진 줄마다 자기 경로(계약 밖) — 다시 풀 때 씁니다.

  const resolveUrl = (path: string | null): string | null => {
    try {
      return path === null ? null : imageUrlOf(path);
    } catch {
      return null;
    }
  };

  const fromSeed = (message: ChatFixtureMessage): ChatMessage => {
    const at = now() - message.minutesAgo * MINUTE_MS;
    const id = messageId();
    switch (message.kind) {
      case "text":
        return { id, at, kind: "text", from: message.from, text: message.text };
      case "photo":
        photoPaths.set(id, message.imagePath);
        return { id, at, kind: "photo", imageUrl: resolveUrl(message.imagePath) };
      case "voice":
        return { id, at, kind: "voice", durationMs: message.durationMs, text: message.text };
    }
  };

  const rooms = new Map<string, RoomState>(
    seed.rooms.map((room) => [room.roomId, newRoomState(room, room.messages.map(fromSeed))]),
  );

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // 구독자 하나의 실패가 출처를 멈추지 않습니다.
      }
    }
  };

  const changed = (room: RoomState) => {
    room.summaryCache = null;
    room.threadCache = null;
    snapshotCache = null;
    notify();
  };

  const schedule = (room: RoomState, ms: number, fn: () => void) => {
    if (disposed) return;
    try {
      const handle: unknown = timers.setTimeout(() => {
        room.handles.delete(handle);
        if (disposed) return;
        fn();
      }, ms);
      room.handles.add(handle);
    } catch {
      // 타이머를 걸지 못하면 정해 둔 답 · 도착만 오지 않습니다 — 호출한 쪽(보내기 · 입력 비우기)을 끊지 않습니다.
    }
  };

  const isOpenAccess = (room: RoomState) => room.seed.access.kind === "open";
  const ideasOf = (room: RoomState) => {
    const sets = room.seed.ideaSets;
    return sets[room.ideaIndex % Math.max(sets.length, 1)] ?? [];
  };

  const advanceIdeas = (room: RoomState) => {
    const count = room.seed.ideaSets.length;
    if (count > 0) room.ideaIndex = (room.ideaIndex + 1) % count;
  };

  const replaceMessage = (room: RoomState, id: string, next: ChatMessage) => {
    room.messages = room.messages.map((message) => (message.id === id ? next : message));
  };

  const summaryOf = (room: RoomState): ChatRoomSummary => {
    if (room.summaryCache === null) {
      const last = room.messages[room.messages.length - 1] ?? null;
      room.summaryCache = {
        roomId: room.seed.roomId,
        counterpart: {
          id: room.seed.counterpart.id,
          name: room.seed.counterpart.name,
          avatarUrl: resolveUrl(room.seed.counterpart.avatarPath),
        },
        access: room.seed.access,
        lastMessage: last,
        unread: room.unread,
        activity: activityOf(room),
        updatedAt: last === null ? 0 : last.at,
      };
    }
    return room.summaryCache;
  };

  const threadOf = (room: RoomState): ChatThread => {
    if (room.threadCache === null) {
      room.threadCache = {
        roomId: room.seed.roomId,
        counterpart: summaryOf(room).counterpart,
        messages: room.messages,
        typing: room.typing,
        ideas: ideasOf(room),
        settings: room.settings,
        storyPoints: room.seed.storyPoints,
      };
    }
    return room.threadCache;
  };

  const live = (roomId: string): RoomState | null =>
    disposed ? null : (rooms.get(roomId) ?? null);
  const clearHandles = (room: RoomState) => {
    for (const handle of room.handles) timers.clearTimeout(handle);
    room.handles.clear();
  };

  const sendText = (roomId: string, text: string) => {
    const room = live(roomId);
    const trimmed = text.trim();
    if (room === null || !isOpenAccess(room) || trimmed === "") return;
    room.messages = [
      ...room.messages,
      { id: messageId(), at: now(), kind: "text", from: "me", text: { ko: trimmed, en: "" } },
    ];
    room.pendingReplies += 1;
    changed(room);
    schedule(room, timing.typingDelayMs, () => {
      room.typing = true;
      changed(room);
      schedule(room, timing.replyDelayMs, () => {
        room.pendingReplies -= 1;
        room.typing = room.pendingReplies > 0;
        const replies = room.seed.cannedReplies;
        if (replies.length > 0) {
          const reply = replies[room.replyIndex % replies.length];
          room.replyIndex += 1;
          if (reply !== undefined) {
            room.messages = [
              ...room.messages,
              { id: messageId(), at: now(), kind: "text", from: "them", text: reply },
            ];
            if (openRoomId !== room.seed.roomId) room.unread += 1;
          }
        }
        advanceIdeas(room);
        changed(room);
      });
    });
  };

  const requestMedia = (roomId: string, media: ChatMediaKind) => {
    const room = live(roomId);
    if (room === null || !isOpenAccess(room)) return;
    const id = messageId();
    const photo = media === "photo";
    room.messages = [
      ...room.messages,
      { id, at: now(), kind: photo ? "photo-pending" : "voice-pending" },
    ];
    if (photo) room.pendingPhotos += 1;
    else room.pendingVoices += 1;
    changed(room);
    schedule(room, photo ? timing.photoArrivalMs : timing.voiceArrivalMs, () => {
      const at = now();
      const { voiceLine, photoPath } = room.seed;
      if (photo) photoPaths.set(id, photoPath);
      if (photo) room.pendingPhotos -= 1;
      else room.pendingVoices -= 1;
      replaceMessage(
        room,
        id,
        photo
          ? { id, at, kind: "photo", imageUrl: resolveUrl(photoPath) }
          : { id, at, kind: "voice", durationMs: voiceLine.durationMs, text: voiceLine.text },
      );
      changed(room);
    });
  };

  return {
    snapshot: () => {
      if (snapshotCache === null) {
        snapshotCache = { rooms: [...rooms.values()].map(summaryOf) };
      }
      return snapshotCache;
    },
    thread: (roomId) => {
      const room = rooms.get(roomId) ?? null;
      return room === null ? null : threadOf(room);
    },
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    openRoom: (roomId) => {
      const room = live(roomId);
      if (room === null) return;
      openRoomId = roomId;
      if (room.unread === 0) return;
      room.unread = 0;
      changed(room);
    },
    closeRoom: (roomId) => {
      if (openRoomId === roomId) openRoomId = null;
    },
    sendText,
    requestMedia,
    regenerateIdeas: (roomId) => {
      const room = live(roomId);
      if (room === null) return;
      advanceIdeas(room);
      changed(room);
    },
    setAutoIdeas: (roomId, on) => {
      const room = live(roomId);
      if (room === null || room.settings.autoIdeas === on) return;
      room.settings = { ...room.settings, autoIdeas: on };
      changed(room);
    },
    setStoryPoint: (roomId, storyPointId) => {
      const room = live(roomId);
      if (room === null || room.settings.storyPointId === storyPointId) return;
      if (!room.seed.storyPoints.some((point) => point.id === storyPointId)) return;
      room.settings = { ...room.settings, storyPointId };
      changed(room);
    },
    report: () => undefined,
    requestFix: () => undefined,
    deleteRoom: (roomId) => {
      const room = live(roomId);
      if (room === null) return;
      clearHandles(room);
      rooms.delete(roomId);
      if (openRoomId === roomId) openRoomId = null;
      snapshotCache = null;
      notify();
    },
    refreshImages: () => {
      snapshotCache = null;
      for (const room of rooms.values()) {
        room.summaryCache = null;
        room.threadCache = null;
        room.messages = room.messages.map((message) =>
          message.kind === "photo" && message.imageUrl === null
            ? { ...message, imageUrl: resolveUrl(photoPaths.get(message.id) ?? null) }
            : message,
        );
      }
    },
    dispose: () => {
      disposed = true;
      for (const room of rooms.values()) clearHandles(room);
      listeners.clear();
    },
  };
}
