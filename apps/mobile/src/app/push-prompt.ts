// 알림 권한을 첫 스토리 뒤에 묻는 판정과 기기 표식입니다(ADR-0176 · ADR-0034 D4 개정).
//
// 표식은 로그인 직후(기존 회원 판정 전) 계정마다 적고 기존 회원이면 바로 지웁니다 — 판정 · 기초 도중에 앱을 꺼도 남고, 세션으로
// 켜는 기존 계정은 갑자기 묻지 않습니다.
// 「스토리를 나왔다」는 저장하지 않습니다: 다시 켜면 첫 유닛 안내가 다시 서므로, 활동 기록이 없으면 스토리를 다시 기다립니다.

import { getItem, removeItem, setItem } from "../lib/storage";
import type { Screen } from "./nav-state";
import { progressUserId } from "./pending-learning-progress";

export const pushPromptStorageKey = (userId: string): string => `libitum.push-prompt.${userId}`;

const PENDING = "pending";

/** 지도가 한가해진 뒤 완료 연출(발자국)이 끝나기를 기다리는 시간 — Letters 추천(ADR-0169)과 같은 값입니다. */
export const PUSH_PROMPT_DELAY_MS = 1200;

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

/** 지금 계정의 표식을 지웁니다 — 기존 회원으로 판정돼 로그인 때 바로 묻는 길입니다. */
export function forgetPushPrompt(): void {
  "background only";
  const userId = progressUserId();
  if (userId !== null) clearPushPrompt(userId);
}

/** 답을 기다리는 사이 로그아웃할 수 있어 묻기 시작한 계정을 받습니다(계정 삭제도 지웁니다). */
export function clearPushPrompt(userId: string): void {
  "background only";
  try {
    removeItem(pushPromptStorageKey(userId));
  } catch {
    // 남으면 다음에 다시 부르지만 이미 답한 권한은 시스템이 다시 묻지 않습니다.
  }
}
