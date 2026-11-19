// 추천 친구 줄의 판정입니다(ADR-0162). 순수 — 카탈로그 · 대화 스냅숏의 방 · 시각만 봅니다.

import type { ChatRoomSummary } from "./chat-source.contract";
import type {
  EarlyAccessOffer,
  FriendCatalog,
  FriendProfile,
  LocalizedLine,
} from "./friend-catalog.contract";

/** 줄에 서는 최대 수 — 넘치면 See all(친구 찾기)이 나머지를 보입니다(ADR-0162 D2). */
export const SUGGESTED_ROW_MAX = 8;

/** added = 목록에 방이 있음, addable = 지금 추가할 수 있음, locked = 이야기에서 아직 못 만남. */
export type FriendStatus = "added" | "addable" | "locked";

export type SuggestedFriend = {
  readonly character: FriendProfile;
  /** 대화 스냅숏의 방(잠긴 방 포함) — 얼굴 그림 주소를 줍니다. */
  readonly room: ChatRoomSummary;
  readonly status: Exclude<FriendStatus, "added">;
  /** 먼저 만나기 — 잠긴 이야기 인물이고 제안이 켜졌을 때만. */
  readonly offer: EarlyAccessOffer | null;
};

export type SuggestInput = {
  readonly catalog: FriendCatalog;
  readonly rooms: readonly ChatRoomSummary[];
  /** 먼저 만나기가 켜졌는가(포트의 `earlyAccess`가 있는가). */
  readonly earlyAccess: boolean;
  readonly now: number;
  readonly metEpisode?: (episodeId: string) => boolean;
};

export type OfferBadge =
  | { readonly kind: "limited" }
  | { readonly kind: "until"; readonly days: number; readonly hours: number };

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** 그 언어 칸, 없으면 en(th · my는 화면 문구가 영어라 늘 en). */
export function localizedLine(line: LocalizedLine, language: string): string {
  const own = (line as Readonly<Record<string, string | undefined>>)[language];
  return own === undefined || own === "" ? line.en : own;
}

/** 열린 방 → added, 일반 · 해금 규칙 없음 · 끝낸 에피소드 → addable, 그 밖 locked. */
export function friendStatusOf(
  character: FriendProfile,
  room: ChatRoomSummary,
  metEpisode?: (episodeId: string) => boolean,
): FriendStatus {
  if (room.access.kind === "open") return "added";
  if (character.kind === "general" || character.unlockEpisodeId === null) return "addable";
  return metEpisode?.(character.unlockEpisodeId) === true ? "addable" : "locked";
}

/** 먼저 만나기 제안 — 꺼짐 · 제안 없음 · 끝 시각 지남 · 이미 추가할 수 있는 인물이면 null. */
export function offerOf(
  character: FriendProfile,
  enabled: boolean,
  now: number,
): EarlyAccessOffer | null {
  const offer = character.earlyAccess;
  if (!enabled || offer === null || character.kind !== "story") return null;
  if (character.unlockEpisodeId === null) return null;
  if (offer.endsAt !== null && offer.endsAt <= now) return null;
  return offer;
}

/** 끝 시각이 없으면 LIMITED만 — 시각을 지어내지 않습니다. 있으면 남은 날 · 시간(내림). */
export function offerBadgeOf(offer: EarlyAccessOffer, now: number): OfferBadge {
  if (offer.endsAt === null) return { kind: "limited" };
  const left = Math.max(0, offer.endsAt - now);
  return {
    kind: "until",
    days: Math.floor(left / DAY_MS),
    hours: Math.floor((left % DAY_MS) / HOUR_MS),
  };
}

/** 그 인물의 방(대화 스냅숏) — 방이 없으면 추천 · 친구 찾기에 서지 않습니다(열 방이 없음). */
export function roomOfFriend(
  rooms: readonly ChatRoomSummary[],
  characterId: string,
): ChatRoomSummary | undefined {
  return rooms.find((room) => room.counterpart.id === characterId);
}

// 묶음 순서(ADR-0162 D1): 새 일반 → 열린 이야기 → 먼저 만나기 이야기 → 잠긴 이야기.
function rankOf(friend: SuggestedFriend): number {
  if (friend.status === "addable") return friend.character.kind === "general" ? 0 : 1;
  return friend.offer === null ? 3 : 2;
}

/** 목록에 아직 없는 인물 — 방이 스냅숏에 있고 열리지 않은 인물만, 묶음 순서 · 묶음 안은 카탈로그 순서. */
export function suggestedFriendsOf(input: SuggestInput): readonly SuggestedFriend[] {
  const list: SuggestedFriend[] = [];
  for (const character of input.catalog.characters) {
    const room = roomOfFriend(input.rooms, character.id);
    if (room === undefined) continue;
    const status = friendStatusOf(character, room, input.metEpisode);
    if (status === "added") continue;
    const offer = status === "locked" ? offerOf(character, input.earlyAccess, input.now) : null;
    list.push({ character, room, status, offer });
  }
  // Array.prototype.sort는 안정 정렬입니다 — 같은 묶음은 카탈로그 순서 그대로.
  return list.sort((a, b) => rankOf(a) - rankOf(b));
}

/** 줄에 서는 앞 `max`명입니다. */
export function suggestedRowOf(
  list: readonly SuggestedFriend[],
  max: number = SUGGESTED_ROW_MAX,
): readonly SuggestedFriend[] {
  return list.slice(0, max);
}
