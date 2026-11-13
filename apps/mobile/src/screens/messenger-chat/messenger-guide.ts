// 메신저 첫 입장 안내(사용자 결정 2026-11-13) — 하단 탭 NEW 배지 · 덕수쌤 목록 카드 · 덕수쌤 방 코치마크의 판정과 기기 기록.
// 판정은 순수, 기록은 기기 저장소(읽기 · 쓰기 실패는 조용히 — 본 것으로 치지 않습니다).

import { getItem, isStorageAvailable, setItem } from "../../lib/storage";
import type { ChatRoomSummary } from "./chat-source.contract";
import type { MessengerAccess } from "./messenger-access";

export type GuideStep = "chat" | "ideas" | "media";
export type GuidePart = "list" | "room";

/** 안내를 맡는 인물 방입니다(서버 모드 인물 표의 덕수쌤). 없으면 안내가 서지 않습니다. */
export const GUIDE_ROOM_ID = "duksu";
/** 사진 · 음성이 서버에 이어지면 true — 그 전에는 코치마크의 사진 · 음성 단계를 건너뜁니다. */
export const MESSENGER_MEDIA_READY = false;

export const messengerTabVisitedStorageKey = "libitum.messenger.tab-visited";
export const messengerGuideSeenStorageKey = "libitum.messenger.guide-seen";

/** 메신저 탭에 처음 들어가기 전이거나 안 연 새 친구가 있으면 NEW. */
export function messengerTabBadge(input: { visited: boolean; newFriend: boolean }): "new" | null {
  return !input.visited || input.newFriend ? "new" : null;
}

/** 열 수 있는 계정의 열린 방 가운데 아직 안 연 새 친구(isNew)가 있나 — 손님 · 시험 계정 아님은 방을 못 열어 늘 false. */
export function hasNewFriend(rooms: readonly ChatRoomSummary[], access: MessengerAccess): boolean {
  return access === "open" && rooms.some((room) => room.isNew && room.access.kind === "open");
}

export function guideSteps(input: { mediaReady: boolean }): readonly GuideStep[] {
  return input.mediaReady ? ["chat", "ideas", "media"] : ["chat", "ideas"];
}

const PARTS: readonly GuidePart[] = ["list", "room"];

export function guideSeenFrom(raw: string | null): readonly GuidePart[] {
  if (raw === null || raw === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen: GuidePart[] = [];
  for (const value of parsed as unknown[])
    for (const part of PARTS) if (value === part && !seen.includes(part)) seen.push(part);
  return seen;
}

/** 이 안내를 띄울지 — 저장소를 못 쓰면 매번 뜨지 않게 띄우지 않습니다. */
export function guideUnseen(part: GuidePart): boolean {
  try {
    return (
      isStorageAvailable() && !guideSeenFrom(getItem(messengerGuideSeenStorageKey)).includes(part)
    );
  } catch {
    return false;
  }
}

export function markGuideSeen(part: GuidePart): void {
  try {
    const seen = guideSeenFrom(getItem(messengerGuideSeenStorageKey));
    if (!seen.includes(part))
      setItem(messengerGuideSeenStorageKey, JSON.stringify([...seen, part]));
  } catch {
    // 저장 실패가 화면을 막지 않습니다.
  }
}

/** 메신저 탭에 들어간 적이 있나 — 못 읽으면 들어간 것으로(배지가 늘 붙어 있지 않게). */
export function messengerTabVisited(): boolean {
  try {
    return !isStorageAvailable() || getItem(messengerTabVisitedStorageKey) === "1";
  } catch {
    return true;
  }
}

export function markMessengerTabVisited(): void {
  try {
    if (getItem(messengerTabVisitedStorageKey) !== "1") setItem(messengerTabVisitedStorageKey, "1");
  } catch {
    // 저장 실패가 화면을 막지 않습니다.
  }
}

/** 본 안내 기록 포트 — 화면은 이것만 압니다(테스트는 메모리 판). */
export type GuideStore = {
  readonly unseen: (part: GuidePart) => boolean;
  readonly markSeen: (part: GuidePart) => void;
};

export const deviceGuideStore: GuideStore = { unseen: guideUnseen, markSeen: markGuideSeen };
