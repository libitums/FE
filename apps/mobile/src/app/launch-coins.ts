// 엽전 출시 안내(ADR-0140) — 엽전 모달 → 채팅 모달 순서와 기기 기록. 판정은 순수, 기록은 기기 저장소.
// 새 사용자는 튜토리얼(u00) 최종을 끝낸 뒤, 기존 사용자는 업데이트 뒤 첫 여정 맵에서 서버 지급(한 번)을 받고 모달을 봅니다.

import type { CatalogProgress } from "../lib/catalog-progress";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import { progressUserId } from "./pending-learning-progress";

/** 계정마다 따로 — 한 기기에서 계정을 바꿔도 다른 계정의 모달 기록 · 숫자가 섞이지 않습니다(안정성 리뷰 5). */
export const launchCoinsStorageKey = (userId: string): string => `libitum.launch-coins.${userId}`;
const TUTORIAL = "u00-tutorial";
const TUTORIAL_FINAL = "RP";

/** 서버가 처음 준 보너스와 그때 소급된 학습 보상, 두 모달을 봤는지. */
export type LaunchRecord = {
  readonly learning: number;
  readonly bonus: number;
  readonly coinsShown: boolean;
  readonly chatShown: boolean;
};

export type LaunchStep = "coins" | "chat" | null;

/**
 * 튜토리얼을 끝냈나 — u00 최종(RP) 또는 옛 튜토리얼 통과 기록(ADR-0081 — Episode 1을 여는 것과 같은 조건).
 * 새 사용자는 그 전에 서버 지급 · 모달을 미룹니다.
 */
export function tutorialDone(progress: CatalogProgress, legacyPassed: boolean): boolean {
  return legacyPassed || (progress[TUTORIAL] ?? []).includes(TUTORIAL_FINAL);
}

/** 지금 띄울 모달 — 엽전을 먼저, 그 뒤 메신저를 쓸 수 있으면 채팅. 지도가 한가하지 않으면 아무것도. */
export function launchStep(input: {
  readonly record: LaunchRecord | null;
  readonly chatOpen: boolean;
  readonly idle: boolean;
}): LaunchStep {
  const { record, chatOpen, idle } = input;
  if (!idle || record === null) return null;
  if (!record.coinsShown) return "coins";
  if (chatOpen && !record.chatShown) return "chat";
  return null;
}

export function launchRecordFrom(raw: string | null): LaunchRecord | null {
  if (raw === null || raw.trim() === "") return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    const learning = value?.learning;
    const bonus = value?.bonus;
    if (typeof learning !== "number" || typeof bonus !== "number") return null;
    return {
      learning,
      bonus,
      coinsShown: value?.coinsShown === true,
      chatShown: value?.chatShown === true,
    };
  } catch {
    return null;
  }
}

export type LaunchStore = {
  readonly read: () => LaunchRecord | null;
  readonly write: (record: LaunchRecord) => void;
};

/** 지금 로그인한 계정의 기록 — background(효과 · 핸들러)에서만 부릅니다. 로그인이 없으면 읽지도 쓰지도 않습니다. */
export const deviceLaunchStore: LaunchStore = {
  read: () => {
    "background only";
    try {
      const userId = progressUserId();
      return userId !== null && isStorageAvailable()
        ? launchRecordFrom(getItem(launchCoinsStorageKey(userId)))
        : null;
    } catch {
      return null;
    }
  },
  write: (record) => {
    "background only";
    try {
      const userId = progressUserId();
      if (userId !== null) setItem(launchCoinsStorageKey(userId), JSON.stringify(record));
    } catch {
      // 저장 실패가 화면을 막지 않습니다 — 다음 실행에 다시 볼 수 있습니다.
    }
  },
};
