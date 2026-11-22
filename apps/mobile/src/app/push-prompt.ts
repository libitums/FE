// 알림 권한을 첫 스토리 뒤에 묻는 판정과 기기 표식입니다(ADR-0176 · ADR-0034 D4 개정).
//
// 표식은 새 가입으로 판정된 순간 계정마다 적습니다 — 기초 도중에 앱을 꺼도 남고, 세션으로 켜는 기존 계정은 갑자기 묻지 않습니다.
// 「스토리를 나왔다」는 저장하지 않습니다: 다시 켜면 첫 유닛 안내가 다시 서므로, 활동 기록이 없으면 스토리를 다시 기다립니다.

import { getItem, removeItem, setItem } from "../lib/storage";
import type { Screen } from "./nav-state";
import { progressUserId } from "./pending-learning-progress";

export const pushPromptStorageKey = (userId: string): string => `libitum.push-prompt.${userId}`;

const PENDING = "pending";

export type PushPromptInput = {
  readonly signedIn: boolean;
  readonly pending: boolean;
  /** 지도 루트이고 다른 안내 · 겹침이 없음. */
  readonly idle: boolean;
  /** 이 실행에서 표지 스토리를 끝냈거나 · 건너뛰었거나 · 나왔음. */
  readonly storyLeft: boolean;
  readonly activityCount: number;
};

export function pushPromptDue(input: PushPromptInput): boolean {
  const { signedIn, pending, idle, storyLeft, activityCount } = input;
  return signedIn && pending && idle && (storyLeft || activityCount > 0);
}

export function leftStory(previous: Screen["name"], current: Screen["name"]): boolean {
  return previous === "catalog-cover" && current !== "catalog-cover";
}

export function markPushPromptPending(): void {
  "background only";
  try {
    const userId = progressUserId();
    if (userId !== null) setItem(pushPromptStorageKey(userId), PENDING);
  } catch {
    // 적지 못해도 로그인 · 입장을 막지 않습니다 — 설정 › Notifications에서 켤 수 있습니다.
  }
}

export function isPushPromptPending(): boolean {
  "background only";
  try {
    const userId = progressUserId();
    if (userId === null) return false;
    return getItem(pushPromptStorageKey(userId))?.trim() === PENDING;
  } catch {
    return false;
  }
}

/** 답을 기다리는 사이 로그아웃할 수 있어 묻기 시작한 계정을 받습니다. */
export function clearPushPrompt(userId: string): void {
  "background only";
  try {
    removeItem(pushPromptStorageKey(userId));
  } catch {
    // 남으면 다음에 다시 부르지만 이미 답한 권한은 시스템이 다시 묻지 않습니다.
  }
}
