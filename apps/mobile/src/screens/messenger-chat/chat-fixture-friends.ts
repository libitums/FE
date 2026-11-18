// 출처의 추천 친구입니다 — 서버 목록(`companion_friends`)을 읽어 보이는 친구를 정하고, 추가하면 방을 열어 기기에 적고 해금 선톡과
// 같은 첫 말을 청합니다(ADR-0152 `trigger: "unlock"`). 목록을 못 읽으면(RPC 없음 · 404 · 오프라인) 친구를 보이지 않습니다. 던지지 않습니다.

import type {
  ChatAddFriendResult,
  ChatFriend,
  ChatFriendsPort,
  ChatFriendsState,
  FriendStore,
} from "./chat-friends.contract";
import { openLockedRoom, type RoomState } from "./chat-fixture-room";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { visibleFriendsOf } from "./companion-friends";
import { COMPANION_CHARACTERS } from "./companion-roster";

export type FriendsDeps = {
  readonly remote: ChatRemote | undefined;
  readonly rooms: ReadonlyMap<string, RoomState>;
  readonly store: FriendStore | undefined;
  readonly now: () => number;
  readonly openRoomId: () => string | null;
  readonly openingOf: (room: RoomState) => ChatMessage | null;
  readonly changed: (room: RoomState) => void;
  /** 방이 아닌 상태(목록 · 성인 확인)가 바뀌었을 때 — 출처 구독자에게 알립니다. */
  readonly notify: () => void;
  readonly greetUnlocked: ((roomId: string) => void) | undefined;
  readonly disposed: () => boolean;
};

const FRIEND_IDS = COMPANION_CHARACTERS.filter((c) => c.kind === "friend").map((c) => c.id);

const sameFriends = (a: readonly ChatFriend[], b: readonly ChatFriend[]) =>
  a.length === b.length &&
  a.every((f, i) => f.id === b[i]?.id && f.romanceTier === b[i]?.romanceTier);
const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

export type FriendsSourcePort = ChatFriendsPort & {
  /** 서버 프로필을 읽었습니다(생년과 같은 `companion_load_profile`) — `adultAck` 칸이 있으면 받습니다. */
  readonly profileLoaded: (loaded: { readonly adultAck?: boolean | null }) => void;
};

export function createFriendsPort(deps: FriendsDeps): FriendsSourcePort {
  let server: readonly ChatFriend[] | null = null;
  let status: ChatFriendsState["status"] =
    deps.remote?.friends === undefined ? "unavailable" : "loading";
  let adultAck: boolean | null = null;
  let loading = false;
  let cache: ChatFriendsState | null = null;

  const friendRoom = (id: string): RoomState | null =>
    FRIEND_IDS.includes(id)
      ? ([...deps.rooms.values()].find((room) => room.seed.counterpart.id === id) ?? null)
      : null;

  const state = (): ChatFriendsState => {
    const visible = visibleFriendsOf(server);
    const added = FRIEND_IDS.filter((id) => friendRoom(id)?.access.kind === "open");
    if (
      cache !== null &&
      cache.status === status &&
      cache.adultAck === adultAck &&
      sameFriends(cache.visible, visible) &&
      sameIds(cache.added, added)
    )
      return cache;
    cache = { status, visible, added, adultAck };
    return cache;
  };

  const refresh = () => {
    const load = deps.remote?.friends;
    if (load === undefined || loading || deps.disposed()) return;
    loading = true;
    void load()
      .catch(() => null)
      .then((list) => {
        loading = false;
        if (deps.disposed()) return;
        // 다시 읽기를 못 하면 앞서 받은 목록을 지킵니다(오프라인 한 번에 줄이 사라지지 않게). 처음부터 못 받았으면 친구 없음.
        if (list !== null) {
          server = list;
          status = "ready";
        } else if (server === null) status = "unavailable";
        deps.notify();
      });
  };

  const add = (characterId: string): ChatAddFriendResult => {
    const room = deps.disposed() ? null : friendRoom(characterId);
    if (room === null) return { kind: "unavailable" };
    const roomId = room.seed.roomId;
    if (room.access.kind === "open") return { kind: "already-added", roomId };
    if (!state().visible.some((friend) => friend.id === characterId))
      return { kind: "unavailable" };
    openLockedRoom(room, deps.openingOf(room), {
      isNew: true,
      unread: deps.openRoomId() !== roomId,
    });
    try {
      deps.store?.add(characterId, deps.now());
    } catch {
      // 기기에 못 적으면 이번 실행만 열려 있습니다 — 다음 실행에 추천 줄이 다시 섭니다.
    }
    deps.changed(room);
    deps.greetUnlocked?.(roomId);
    return { kind: "added", roomId };
  };

  refresh();

  return {
    state,
    add,
    refresh,
    ackAdult: async () => {
      const ack = deps.remote?.ackAdult;
      if (ack === undefined) return false;
      const result = await ack().catch(() => null);
      if (result === null || deps.disposed()) return false;
      adultAck = result;
      deps.notify();
      return result;
    },
    profileLoaded: (loaded) => {
      if (typeof loaded.adultAck !== "boolean" || loaded.adultAck === adultAck) return;
      adultAck = loaded.adultAck;
      deps.notify();
    },
  };
}
