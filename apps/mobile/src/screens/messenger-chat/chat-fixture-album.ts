// 출처의 앨범 · 다시 만들기 · 사진 속 내 모습 저장입니다(ADR-0150). 던지지 않습니다.
//
// - 서버 방: 앨범은 `companion_list_media`(+ 서명 URL), 다시 만들기는 서버 `again` 요청(방 로그에 자리표시자 → 결과가 옛 결과 자리).
// - 가짜 방: 앨범은 방 로그의 결과 줄, 다시 만들기는 정해 둔 시간 뒤 새 결과 줄이 옛 줄 자리를 대신합니다(엽전은 화면이 앱 지갑에서).
// - 내 모습: 바뀌면 기기에 적고(다음 실행에도 「물었음」) 서버 방이면 `companion_save_profile`로 보냅니다.

import type {
  ChatAlbumItem,
  ChatAlbumPort,
  ChatRemakeResult,
  ChatSnapshotSelf,
} from "./chat-album.contract";
import { albumItemsFromLog } from "./chat-album-rules";
import type { FixtureChatSourceOptions } from "./chat-fixture.contract";
import type { FixtureSettings } from "./chat-fixture-settings";
import { isOpenAccess, type RoomState } from "./chat-fixture-room";
import type { ChatMediaRemote, ChatMediaTarget } from "./chat-media.contract";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatMediaKind, ChatMessage, ChatSource } from "./chat-source.contract";

/** 사진 속 내 모습의 기기 저장입니다 — 앱은 기기 저장소, 테스트는 메모리. */
export type SnapshotSelfStore = {
  readonly read: () => ChatSnapshotSelf | null;
  readonly write: (self: ChatSnapshotSelf) => void;
};

/** 한 쪽의 크기(RPC 상한 50 안). */
export const ALBUM_PAGE_SIZE = 30;

export type AlbumDeps = {
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  readonly now: () => number;
  readonly messageId: () => string;
  /** 서버 방의 사진 · 음성 포트 — 없으면 가짜 앨범. */
  readonly media: ChatMediaRemote | undefined;
  /** 서버 방의 다시 만들기(`chat-remote-media`). */
  readonly remoteRemake:
    | ((roomId: string, target: ChatMediaTarget, media: ChatMediaKind) => Promise<ChatRemakeResult>)
    | undefined;
};

const kindOf = (kind: "snapshot" | "voice"): ChatMediaKind =>
  kind === "snapshot" ? "photo" : "voice";

export function albumMethods(deps: AlbumDeps): ChatAlbumPort {
  const { live, changed, schedule, now, messageId, media, remoteRemake } = deps;

  const serverLoad = async (room: RoomState, before: number | null) => {
    if (media?.list === undefined) return { items: [], hasMore: false };
    const page = await media.list({
      characterId: room.seed.counterpart.id,
      before,
      limit: ALBUM_PAGE_SIZE,
    });
    if (page === null) return null;
    const items = await Promise.all(
      page.items
        .filter((row) => row.status === "complete")
        .map(async (row): Promise<ChatAlbumItem> => ({
          id: row.id,
          messageId: row.messageId,
          kind: kindOf(row.kind),
          url: row.path === null ? null : await media.sign(row.path),
          aspect: row.aspect,
          line: row.line,
          createdAt: row.createdAt,
          fromPastChat: row.fromPastChat,
        })),
    );
    return { items, hasMore: page.hasMore };
  };

  /** 가짜 다시 만들기 — 자리표시자 뒤 새 결과 줄이 옛 줄 자리를 대신합니다(M7). */
  const fixtureRemake = (room: RoomState, item: ChatAlbumItem): ChatRemakeResult => {
    const old = room.messages.find((m) => m.id === item.id);
    if (old === undefined || (old.kind !== "photo" && old.kind !== "voice"))
      return { kind: "refused", notice: "not-eligible" };
    const pendingId = messageId();
    const photo = old.kind === "photo";
    room.messages = room.messages.map((m): ChatMessage =>
      m.id === old.id
        ? { id: pendingId, at: now(), kind: photo ? "photo-pending" : "voice-pending" }
        : m,
    );
    if (photo) room.pendingPhotos += 1;
    else room.pendingVoices += 1;
    changed(room);
    const timing = CHAT_PLACEHOLDERS.timing;
    schedule(room, photo ? timing.photoArrivalMs : timing.voiceArrivalMs, () => {
      if (photo) room.pendingPhotos -= 1;
      else room.pendingVoices -= 1;
      const id = messageId();
      room.messages = room.messages.map((m) =>
        m.id === pendingId ? { ...old, id, at: now() } : m,
      );
      changed(room);
    });
    return { kind: "started" };
  };

  return {
    load: async (roomId, before) => {
      const room = live(roomId);
      if (room === null) return null;
      try {
        if (media !== undefined) return await serverLoad(room, before);
      } catch {
        return null;
      }
      const items = albumItemsFromLog(room.messages).filter(
        (item) => before === null || item.createdAt < before,
      );
      return { items, hasMore: false };
    },
    remake: async (roomId, item) => {
      const room = live(roomId);
      if (room === null || !isOpenAccess(room) || item.fromPastChat) return { kind: "failed" };
      if (remoteRemake !== undefined)
        return remoteRemake(roomId, { messageId: item.messageId, text: item.line }, item.kind);
      return fixtureRemake(room, item);
    },
  };
}

/** 기기에 적힌 내 모습 — 없거나 읽지 못하면 null. */
export function readSnapshotSelf(store: SnapshotSelfStore | undefined): ChatSnapshotSelf | null {
  try {
    return store?.read() ?? null;
  } catch {
    return null;
  }
}

/** 내 모습이 바뀌면 기기에 적고 서버 방이면 보냅니다. 같은 값 · null이면 무동작. */
export function persistSnapshotSelf(
  before: ChatSnapshotSelf | null,
  after: ChatSnapshotSelf | null,
  store: SnapshotSelfStore | undefined,
  media: ChatMediaRemote | undefined,
): void {
  if (after === null || after === before) return;
  try {
    store?.write(after);
  } catch {
    // 기기 저장 실패 — 다음 실행에 한 번 더 물을 뿐입니다.
  }
  void media?.saveSelf?.(after).catch(() => false);
}

/** 출처에 붙는 앨범 · 내 모습 메서드 — 기기에 적힌 내 모습을 먼저 싣고, 바뀌면 기기 · 서버에 적습니다. */
export function albumSourceMethods(
  deps: Omit<AlbumDeps, "media" | "remoteRemake"> & {
    readonly settings: FixtureSettings;
    readonly settingsApi: Pick<ChatSource, "setPreferences">;
    readonly options: FixtureChatSourceOptions;
    readonly remoteRoom: { readonly remake: NonNullable<AlbumDeps["remoteRemake"]> } | null;
  },
): Pick<ChatSource, "album" | "setPreferences"> {
  const { settings, settingsApi, options } = deps;
  const media = options.remote?.media;
  const stored = readSnapshotSelf(options.selfStore);
  if (stored !== null) settings.setPreferences({ snapshotSelf: stored });
  return {
    album: albumMethods({ ...deps, media, remoteRemake: deps.remoteRoom?.remake }),
    setPreferences: (patch) => {
      const before = settings.preferences().snapshotSelf;
      settingsApi.setPreferences(patch);
      persistSnapshotSelf(before, settings.preferences().snapshotSelf, options.selfStore, media);
    },
  };
}
