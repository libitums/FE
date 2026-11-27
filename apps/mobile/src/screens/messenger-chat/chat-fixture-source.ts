// 가짜 대화 출처입니다(messenger-chat-ui spec §5.1). 씨앗에서 시작해 정해 둔 답장 · 미디어 도착을
// 주입한 타이머로 흉내 냅니다. 어떤 호출도 던지지 않습니다.

import { chatFixtureSeed } from "./chat-fixture";
import { feedbackMethods } from "./chat-fixture-feedback";
import { createFixtureSettings, settingsMethods } from "./chat-fixture-settings";
import { inputBlockOf, seedMessageReader } from "./chat-fixture-safety";
import { sourceBirthYear } from "./chat-fixture-birth-year";
import {
  advanceIdeas,
  clearRoomHandles,
  defaultTimers,
  isOpenAccess,
  MINUTE_MS,
  newRoomState,
  openLockedRoom,
  replaceMessage,
  summaryOf as roomSummaryOf,
  threadOf as roomThreadOf,
  type RoomState,
} from "./chat-fixture-room";
import { albumSourceMethods } from "./chat-fixture-album";
import { mediaRequester } from "./chat-fixture-media";
import { createFixtureNotes } from "./chat-fixture-notes";
import { remoteRoomMethods, uuidV4 } from "./chat-fixture-remote";
import { roomResetMethods } from "./chat-room-reset";
import { localSender } from "./chat-fixture-local-send";
import type {
  ChatFixtureMessage,
  ChatMediaKind,
  ChatMessage,
  ChatSnapshot,
  ChatSource,
  ChatUnlockResult,
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

  const fromSeed = seedMessageReader({ now, messageId, photoPaths, resolveUrl });

  const rooms = new Map<string, RoomState>();
  const settings = createFixtureSettings(seed, now, options);

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // 구독자 하나의 실패가 출처를 멈추지 않습니다.
      }
    }
  };

  const settingsApi = settingsMethods(settings, { disposed: () => disposed, rooms, notify });
  const birthYear = sourceBirthYear(
    seed.birthYear,
    options,
    () => disposed,
    () => {
      snapshotCache = null;
      notify();
    },
  );

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

  const summaryOf = (room: RoomState) => roomSummaryOf(room, resolveUrl);
  // 추천 답변을 끄면(ADR-0126) 모든 방의 보기가 빈다.
  const threadOf = (room: RoomState) =>
    roomThreadOf(room, resolveUrl, settings.preferences().replyIdeas);

  const live = (roomId: string): RoomState | null =>
    disposed ? null : (rooms.get(roomId) ?? null);
  const clearHandles = (room: RoomState) => clearRoomHandles(room, timers);

  const notes = createFixtureNotes({ seed, schedule, changed, live });
  const openingOf = (room: RoomState): ChatMessage | null => {
    const { opening } = room.seed;
    return opening === undefined
      ? null
      : { id: messageId(), at: now(), kind: "text", from: "them", text: opening };
  };

  for (const roomSeed of seed.rooms) {
    const messages = roomSeed.messages.map(fromSeed);
    const room = newRoomState(roomSeed, messages, inputBlockOf(roomSeed, now()));
    room.notes = notes.seedNotes(roomSeed.messages, messages);
    if (options.remote !== undefined) room.origin = "server";
    rooms.set(roomSeed.roomId, room);
    // 재시작 뒤 모습: 이미 해금한 인물은 처음부터 열린 채 — opening 한 줄 · 안 읽음 0 · NEW 아님.
    if (roomSeed.access.kind === "locked" && options.unlocked?.includes(roomSeed.counterpart.id)) {
      openLockedRoom(room, openingOf(room), { isNew: false, unread: false });
    }
  }

  const unlockCharacter = (characterId: string): ChatUnlockResult => {
    const room = disposed
      ? undefined
      : [...rooms.values()].find((candidate) => candidate.seed.counterpart.id === characterId);
    if (room === undefined) return { kind: "unknown" };
    const roomId = room.seed.roomId;
    if (room.access.kind === "open") return { kind: "already-open", roomId };
    openLockedRoom(room, openingOf(room), { isNew: true, unread: openRoomId !== roomId });
    changed(room);
    remoteRoom?.greetUnlocked(roomId);
    return { kind: "unlocked", roomId };
  };

  const localSendText = localSender({
    ...{ live, now, messageId, changed, schedule },
    openRoomId: () => openRoomId,
    onReplyArrived: notes.onReplyArrived,
  });

  // 비회원 미리보기(ADR-0166): 서버 없이 열린 빈 방을 열면 그 방의 첫 말을 놓습니다.
  const greetLocally = (room: RoomState) => {
    const opening = room.messages.length === 0 && isOpenAccess(room) ? openingOf(room) : null;
    if (opening === null) return;
    room.messages = [opening];
    changed(room);
  };

  // 서버 모드(ADR-0137): 방을 열면 기록 · 첫 인사, 보내기는 서버 턴. 없으면 정해 둔 답.
  const remoteRoom =
    options.remote === undefined
      ? null
      : remoteRoomMethods({
          ...{ remote: options.remote, live, changed, now, schedule },
          mediaHooks: options.mediaHooks,
          ...{ openRoomId: () => openRoomId, uuid: () => uuidV4() },
          preview: options.previewOnStart === true ? [...rooms.keys()] : [],
          roomIds: () => [...rooms.keys()],
        });
  const sendText = remoteRoom?.sendText ?? localSendText;

  // 서버 방은 서버 사진 · 음성(ADR-0146 「앱 연결」), 아니면 정해 둔 시간 뒤 픽스처.
  const fixtureMedia = { live, changed, schedule, now, messageId, photoPaths, resolveUrl };
  const requestMedia = remoteRoom?.requestMedia ?? mediaRequester(fixtureMedia);

  return {
    snapshot: () => {
      if (snapshotCache === null || snapshotCache.preferences !== settings.preferences()) {
        snapshotCache = {
          rooms: [...rooms.values()].map(summaryOf),
          birthYear: birthYear.current(),
          preferences: settings.preferences(),
        };
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
      remoteRoom?.loadRoom(roomId);
      if (remoteRoom === null && options.greetOnOpen === true) greetLocally(room);
      if (room.unread === 0 && !room.isNew) return;
      room.unread = 0;
      room.isNew = false;
      changed(room);
    },
    closeRoom: (roomId) => {
      if (openRoomId === roomId) openRoomId = null;
    },
    sendText,
    requestMedia,
    // 예시 포트가 없는 원격에서는 내놓지 않습니다 — 방 안내가 답을 기다리지 않게.
    ...(remoteRoom === null || options.remote?.media?.sample === undefined
      ? {}
      : { sampleSnapshot: remoteRoom.sample }),
    regenerateIdeas: (roomId) => {
      const room = live(roomId);
      if (room === null) return;
      advanceIdeas(room);
      changed(room);
    },
    setBirthYear: birthYear.set,
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
    requestMeaning: notes.requestMeaning,
    openCorrection: notes.openCorrection,
    unlockCharacter,
    ...settingsApi,
    ...albumSourceMethods({ ...fixtureMedia, settings, settingsApi, options, remoteRoom }),
    report: () => undefined,
    ...feedbackMethods({ live, changed, sendText }),
    ...roomResetMethods({
      ...{ live, changed, clearHandles, openingOf, remote: options.remote ?? null },
      ...{ loadRoom: remoteRoom?.loadRoom, isOpen: (roomId) => openRoomId === roomId },
      forget: (roomId) => {
        rooms.delete(roomId);
        if (openRoomId === roomId) openRoomId = null;
        snapshotCache = null;
        notify();
      },
    }),
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
    server: remoteRoom?.controls ?? null,
    dispose: () => {
      disposed = true;
      for (const room of rooms.values()) clearHandles(room);
      listeners.clear();
    },
  };
}
