// 추천 친구 결선입니다 — 계정(출처 키)마다 친구 기록 저장 하나를 출처 · 이벤트가 함께 쓰고(캐시가 갈라지지 않게), 메신저 sink에
// 첫 글 이벤트를 덧대고, 방을 열 때 다시 찾음 이벤트를 판정합니다. 출처 키는 `messenger-chat-wiring`이 넘깁니다(순환 없이).

import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { FriendStore } from "../screens/messenger-chat/chat-friends.contract";
import { friendReturnTracker, withFriendEvents } from "../screens/messenger-chat/friend-events";
import { deviceFriendStore, memoryFriendStore } from "../screens/messenger-chat/friend-store";

let cached: { readonly key: string; readonly store: FriendStore } | null = null;
const testStores = new WeakMap<object, FriendStore>(); // 테스트 저장 묶음마다 빈 메모리 기록 하나
const trackReturn = friendReturnTracker();

/**
 * 그 계정의 친구 기록 — 테스트 저장(`overrides`)이 있으면 그 메모리 기록(없으면 빈 메모리), 아니면 기기 저장(같은 키면 같은 객체 —
 * 출처와 이벤트의 캐시가 갈라지지 않게).
 */
export function friendStoreFor(
  key: string,
  overrides: { readonly friends?: FriendStore } | null,
): FriendStore {
  if (overrides !== null) {
    if (overrides.friends !== undefined) return overrides.friends;
    const store = testStores.get(overrides) ?? memoryFriendStore();
    testStores.set(overrides, store);
    return store;
  }
  if (cached?.key !== key) cached = { key, store: deviceFriendStore(key) };
  return cached.store;
}

/** 메신저 sink에 추천 친구 첫 글 이벤트를 덧댑니다(없는 sink는 그대로). */
export function friendEventSink(
  sink: EpisodeIntroEventSink,
  store: FriendStore,
): EpisodeIntroEventSink {
  return withFriendEvents(sink, store);
}

/** 목록에서 방을 열 때 — 추가한 친구를 7일 안의 다른 날 다시 찾았으면 `friend_return`. */
export function noteFriendRoomOpened(
  roomId: string,
  store: FriendStore,
  sink: EpisodeIntroEventSink,
  now: number,
): void {
  trackReturn({ roomId, store, sink, now });
}
