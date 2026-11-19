// 추천 친구 포트의 결선입니다(ADR-0162). 카탈로그는 앱의 인물 표(서버 인물 목록이 생기면 그것), 추가는 해금과 같은 길 —
// 대화 출처의 `unlockCharacter`(잠긴 방 열기 + 서버 방이면 `companion-greet` trigger unlock)와 해금 저장입니다. 먼저 만나기는
// 서버 RPC(`companion_early_access_offers` · `companion_unlock_early`, 20261213)입니다.
// 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { COMPANION_CATALOG } from "../screens/messenger-chat/companion-roster";
import type {
  AddFriendResult,
  EarlyAccessResult,
  FriendCatalog,
  SuggestedFriendsPort,
} from "../screens/messenger-chat/friend-catalog.contract";
import type { EarlyAccessRemote } from "../screens/messenger-chat/early-access-parse";
import {
  currentMessengerChatSource,
  messengerUnlockStore,
  reportServerBalance,
} from "./messenger-chat-wiring";

let catalogOverride: FriendCatalog | null = null;

/** 앱 진입점이 서버 대화 포트 공장을 끼웁니다(먼저 만나기 RPC). null이면 꺼짐. */
export function setEarlyAccessRemote(factory: (() => ChatRemote) | null): void {
  earlyFactory = factory;
  earlyRemote = null;
  cachedPort = null;
}

let earlyFactory: (() => ChatRemote) | null = null;
let earlyRemote: EarlyAccessRemote | null = null;

/** 서버 포트는 처음 쓸 때(배경 스레드 — 효과 · 이벤트) 한 번 만듭니다. */
function earlyAccessRemote(): EarlyAccessRemote | null {
  if (earlyRemote === null && earlyFactory !== null)
    earlyRemote = earlyFactory().earlyAccess ?? null;
  return earlyRemote;
}

/** 열기 결과를 화면 결과로 옮기고, 돌려받은 서버 지갑 잔액을 머리 엽전 칩에 알립니다. */
async function unlockEarly(characterId: string): Promise<EarlyAccessResult> {
  const result = await earlyAccessRemote()?.unlock(characterId);
  if (result === null || result === undefined) return { kind: "failed" };
  if (result.balance !== null) reportServerBalance(result.balance);
  if (result.result === "unlocked" || result.result === "already") return { kind: "unlocked" };
  if (result.result === "short") return { kind: "short", shortBy: result.shortBy ?? 0 };
  return { kind: "failed" };
}

/** 테스트가 일반 인물이 든 카탈로그를 끼웁니다(null = 앱 카탈로그). */
export function setFriendCatalogForTests(catalog: FriendCatalog | null): void {
  catalogOverride = catalog;
  cachedPort = null;
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

let cachedPort: SuggestedFriendsPort | null = null;

/**
 * 목록 결선이 렌더마다 부릅니다 — 설정이 같으면 **같은 객체 · 같은 함수**를 돌려줍니다(리뷰 #503: 새 `offers` 함수가 렌더마다
 * 효과를 다시 돌려 제안 RPC를 거듭 불렀습니다).
 */
export function suggestedFriendsPort(): SuggestedFriendsPort {
  if (cachedPort !== null) return cachedPort;
  cachedPort = {
    catalog: () => catalogOverride ?? COMPANION_CATALOG,
    add: addSuggestedFriend,
    // 먼저 만나기(ADR-0162 D5, 2026-11-19 적용) — 서버 포트가 끼워진 앱(진입점)에서만 켜집니다. 손님은 제안 목록이 비어 단추가 없습니다.
    earlyAccess: earlyFactory === null ? null : unlockEarly,
    offers: earlyFactory === null ? null : async () => (await earlyAccessRemote()?.offers()) ?? [],
  };
  return cachedPort;
}
