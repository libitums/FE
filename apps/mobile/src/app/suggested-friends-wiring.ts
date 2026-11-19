// 추천 친구 포트의 결선입니다(ADR-0162). 카탈로그는 앱의 인물 표(서버 인물 목록이 생기면 그것), 추가는 해금과 같은 길 —
// 대화 출처의 `unlockCharacter`(잠긴 방 열기 + 서버 방이면 `companion-greet` trigger unlock)와 해금 저장입니다.
// 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import { COMPANION_CATALOG } from "../screens/messenger-chat/companion-roster";
import type {
  AddFriendResult,
  EarlyAccessResult,
  FriendCatalog,
  SuggestedFriendsPort,
} from "../screens/messenger-chat/friend-catalog.contract";
import { currentMessengerChatSource, messengerUnlockStore } from "./messenger-chat-wiring";

let catalogOverride: FriendCatalog | null = null;

/** 테스트가 일반 인물이 든 카탈로그를 끼웁니다(null = 앱 카탈로그). */
export function setFriendCatalogForTests(catalog: FriendCatalog | null): void {
  catalogOverride = catalog;
}

/** 방을 열고(첫 인사) 해금 기록을 남깁니다. 출처에 그 인물의 방이 없으면 unknown. */
export function addSuggestedFriend(characterId: string): AddFriendResult {
  const source = currentMessengerChatSource();
  if (source === null) return "unknown";
  const result = source.unlockCharacter(characterId);
  if (result.kind === "unknown") return "unknown";
  messengerUnlockStore().add(characterId);
  return result.kind === "unlocked" ? "added" : "already";
}

/**
 * 엽전 먼저 만나기 — 서버 RPC(`companion_unlock_early`, 제안만 · 적용 안 함)가 없어 꺼져 있습니다(ADR-0162 D5). 켜는 곳은
 * 여기 하나입니다: RPC가 생기면 그 호출을 돌려주면 줄 꼬리표 · 시트 단추 · 친구 찾기 알약이 함께 섭니다.
 */
export const EARLY_ACCESS: ((characterId: string) => Promise<EarlyAccessResult>) | null = null;

export function suggestedFriendsPort(): SuggestedFriendsPort {
  return {
    catalog: () => catalogOverride ?? COMPANION_CATALOG,
    add: addSuggestedFriend,
    earlyAccess: EARLY_ACCESS,
  };
}
