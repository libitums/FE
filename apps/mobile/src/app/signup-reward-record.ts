// 가입 보상(ADR-0174)의 판정과 기기 기록입니다. 지급의 정본은 서버 원장(계정당 한 번)이고, 이 기록은 「이 기기에서 이 계정의 지급을
// 이미 물었나 · 모달을 봤나」만 적습니다. 판정은 순수, 기록은 기기 저장소(계정마다 따로).

import type { AccountState } from "../lib/guest-session";
import type { SignupRewardClaim } from "../lib/signup-reward-api";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import { progressUserId } from "./pending-learning-progress";

export const signupRewardStorageKey = (userId: string): string => `libitum.signup-reward.${userId}`;

/** 받은 수(받지 않았으면 0)와 모달을 봤는지. */
export type SignupRewardRecord = { readonly amount: number; readonly shown: boolean };

export type SignupRewardStep = "card" | "modal" | null;

export function signupRewardRecordFrom(raw: string | null): SignupRewardRecord | null {
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

/** 지급 응답 뒤의 기록 — 이번에 받았으면 모달을 기다리고, 아니면(이미 받음 · 기존 회원 · 꺼짐) 이 기기에서 끝난 것으로 적습니다. */
export function signupRewardRecordAfter(claim: SignupRewardClaim): SignupRewardRecord {
  return claim.granted > 0 ? { amount: claim.granted, shown: false } : { amount: 0, shown: true };
}

/**
 * 지금 그릴 것 — 손님은 권유 카드, 로그인했고 받은 보상을 아직 안 봤으면 모달. 지도가 한가하지 않으면 아무것도. 모달은 튜토리얼(u00)을
 * 끝낸 뒤에만 — 그 전에는 첫 유닛 안내가 지도 위에 서며, 안내가 뜨기 전 한 그림에 모달이 먼저 걸리면 안내 강조가 모달 위로 올라옵니다
 * (기기 확인 2026-11-21). 엽전 출시 모달(ADR-0140)과 같은 조건입니다.
 */
export function signupRewardStep(input: {
  readonly account: AccountState;
  readonly record: SignupRewardRecord | null;
  readonly idle: boolean;
  readonly tutorialDone: boolean;
}): SignupRewardStep {
  const { account, record, idle } = input;
  if (!idle) return null;
  if (account === "guest") return "card";
  if (!input.tutorialDone) return null;
  if (account === "signed-in" && record !== null && !record.shown && record.amount > 0)
    return "modal";
  return null;
}

/**
 * 엽전 출시 지급 · 모달(ADR-0140)을 미루나 — 가입 보상이 먼저입니다. 로그인했고 이 계정의 지급을 아직 묻지 않았거나, 받은 모달 ·
 * 날기가 남았으면 미룹니다. 물었는데 실패했으면(기록 없음) 막지 않습니다 — RPC가 아직 없는 서버에서도 출시 모달이 섭니다.
 */
export function signupRewardHoldsLaunch(input: {
  readonly account: AccountState;
  readonly record: SignupRewardRecord | null;
  readonly attempted: boolean;
  readonly flying: boolean;
}): boolean {
  const { account, record, attempted, flying } = input;
  if (account !== "signed-in") return false;
  if (flying) return true;
  if (record === null) return !attempted;
  return !record.shown && record.amount > 0;
}

/** 날기 동안 칩 — 「Got it」 때 값에서 닿은 몫만큼 오릅니다(넘치지 않음). */
export function flightCoinCount(from: number, amount: number, landed: number, of: number): number {
  const share = of <= 0 ? 1 : Math.min(1, Math.max(0, landed / of));
  return from + Math.round(amount * share);
}

export type SignupRewardStore = {
  readonly read: () => SignupRewardRecord | null;
  readonly write: (record: SignupRewardRecord) => void;
};

/** 지금 로그인한 계정의 기록 — background(효과 · 핸들러)에서만 부릅니다. 로그인이 없으면 읽지도 쓰지도 않습니다. */
export const deviceSignupRewardStore: SignupRewardStore = {
  read: () => {
    "background only";
    try {
      const userId = progressUserId();
      return userId !== null && isStorageAvailable()
        ? signupRewardRecordFrom(getItem(signupRewardStorageKey(userId)))
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
        setItem(signupRewardStorageKey(userId), JSON.stringify(record));
    } catch {
      // 저장 실패가 화면을 막지 않습니다 — 다음 실행에 서버가 already_claimed로 답해 모달은 다시 서지 않습니다.
    }
  },
};
