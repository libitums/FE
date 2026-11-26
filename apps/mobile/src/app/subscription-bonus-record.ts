// Chat Plus 첫 구독 보너스(ADR-0196 D3 · D4)의 판정과 기기 기록입니다. 지급 · 「알렸나」의 정본은 서버(원장 · 알림 표)이고, 이 기록은 「이 기기에서
// 이 계정의 보너스를 이미 꺼냈나 · 모달을 봤나」만 적습니다. 판정은 순수, 기록은 기기 저장소(계정마다 따로).

import type { PlanEntitlements } from "../lib/plans-api";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import type { SubscriptionBonusClaim } from "../lib/subscription-bonus-api";
import { progressUserId } from "./pending-learning-progress";

export const subscriptionBonusStorageKey = (userId: string): string =>
  `libitum.subscription-bonus.${userId}`;

/** 받은 수(다른 곳에서 이미 알렸으면 0)와 모달을 봤는지. 기록이 있으면 다시 묻지 않습니다(평생 한 번). */
export type SubscriptionBonusRecord = { readonly amount: number; readonly shown: boolean };

export function subscriptionBonusRecordFrom(raw: string | null): SubscriptionBonusRecord | null {
  if (raw === null || raw.trim() === "") return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    const amount = value?.amount;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) return null;
    return { amount, shown: value?.shown === true };
  } catch {
    return null;
  }
}

/**
 * 언제 묻나 — 대화 요금제(Chat Plus · Premium) 줄의 모양(요금제 · 만료)입니다. 없으면 null(묻지 않음). 이 값이 바뀔 때마다 한 번 묻습니다 —
 * 체험이 유료로 넘어가면(RENEWAL) 만료가 늘어 다시 묻게 됩니다. Premium도 드는 까닭은 Chat Plus로 받은 뒤 곧바로 올린 사람도 보게.
 */
export function subscriptionBonusAskKey(entitlements: PlanEntitlements | null): string | null {
  if (entitlements === null) return null;
  const rows = entitlements.entitlements
    .filter((row) => row.id === "chat_plus" || row.id === "premium")
    .map((row) => `${row.id}:${row.expiresAt ?? ""}`);
  return rows.length === 0 ? null : rows.join("|");
}

/** 알림 응답 뒤의 기록 — 이번에 알렸으면 모달 대기, 이미 알렸으면 끝, 아직 없으면 적지 않음(다음 바뀜에 다시 묻습니다). */
export function subscriptionBonusRecordAfter(
  claim: SubscriptionBonusClaim,
): SubscriptionBonusRecord | null {
  if (claim.amount > 0) return { amount: claim.amount, shown: false };
  return claim.reason === "already_announced" ? { amount: 0, shown: true } : null;
}

/** 모달을 세우나 — 로그인 · 지도가 한가 · 첫 유닛 안내 꺼짐 · 본 적 없는 보너스(푸시 보상과 같은 기준). */
export function subscriptionBonusStep(input: {
  readonly signedIn: boolean;
  readonly record: SubscriptionBonusRecord | null;
  readonly idle: boolean;
  readonly guideOn: boolean;
}): "modal" | null {
  const { record } = input;
  return input.signedIn &&
    input.idle &&
    !input.guideOn &&
    record !== null &&
    !record.shown &&
    record.amount > 0
    ? "modal"
    : null;
}

/** 엽전 출시 · 업데이트 · Letters 안내를 미루나 — 묻는 중 · 모달 대기 · 날기 동안. */
export function subscriptionBonusHoldsLater(input: {
  readonly asking: boolean;
  readonly record: SubscriptionBonusRecord | null;
  readonly flying: boolean;
}): boolean {
  const { record } = input;
  return input.asking || input.flying || (record !== null && !record.shown && record.amount > 0);
}

export type SubscriptionBonusStore = {
  readonly read: () => SubscriptionBonusRecord | null;
  readonly write: (record: SubscriptionBonusRecord) => void;
};

/** 지금 로그인한 계정의 기록 — background(효과 · 핸들러)에서만 부릅니다. 로그인이 없으면 읽지도 쓰지도 않습니다. */
export const deviceSubscriptionBonusStore: SubscriptionBonusStore = {
  read: () => {
    "background only";
    try {
      const userId = progressUserId();
      return userId !== null && isStorageAvailable()
        ? subscriptionBonusRecordFrom(getItem(subscriptionBonusStorageKey(userId)))
        : null;
    } catch {
      return null;
    }
  },
  write: (record) => {
    "background only";
    try {
      const userId = progressUserId();
      if (userId !== null && isStorageAvailable())
        setItem(subscriptionBonusStorageKey(userId), JSON.stringify(record));
    } catch {
      // 저장 실패가 화면을 막지 않습니다 — 서버가 이미 알린 것으로 찍었으므로 다음 실행에 already_announced로 끝납니다.
    }
  },
};
