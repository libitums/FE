// 테스트 지원 — 추천 친구 unit · ui가 함께 쓰는 인물 · 방 만들기입니다. 제품 코드는 import하지 않습니다.

import type { ChatRoomSummary } from "./chat-source.contract";
import type { FriendCatalog, FriendProfile } from "./friend-catalog.contract";

export function friend(id: string, patch: Partial<FriendProfile> = {}): FriendProfile {
  return {
    id,
    name: id,
    avatarPath: null,
    kind: "story",
    unlockEpisodeId: `u${id}`,
    unlockEpisode: 9,
    intro: { en: `${id} intro`, ja: `${id} 紹介` },
    tags: [],
    category: null,
    sheetOpening: { ko: "안녕하세요", en: "Hello" },
    earlyAccess: null,
    profile: { age: null, job: null, mbti: null, voiceSamplePath: null },
    ...patch,
  };
}

export const general = (id: string, patch: Partial<FriendProfile> = {}): FriendProfile =>
  friend(id, { kind: "general", unlockEpisodeId: null, unlockEpisode: null, ...patch });

export function room(id: string, open: boolean, patch: Partial<ChatRoomSummary> = {}) {
  const summary: ChatRoomSummary = {
    roomId: id,
    counterpart: { id, name: id, avatarUrl: `https://img/${id}.webp` },
    access: open ? { kind: "open" } : { kind: "locked", unlockEpisode: 9 },
    lastMessage: null,
    unread: 0,
    activity: "idle",
    updatedAt: 0,
    isNew: false,
    ...patch,
  };
  return summary;
}

export const catalogOf = (
  characters: readonly FriendProfile[],
  categories: FriendCatalog["categories"] = [],
): FriendCatalog => ({ characters, categories });
