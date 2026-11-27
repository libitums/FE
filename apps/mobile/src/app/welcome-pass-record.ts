// 첫날 무제한의 시작(ADR-0186 개정 4)이 읽는 기기 기록 — 이 계정의 가입 보상 창이 이 기기에서 처음 선 시각과, 창이 아직 앞에
// 있는지. 판정은 순수, 기록은 기기 저장소(계정마다 따로, 가입 보상 기록 `libitum.signup-reward.<uid>`와 같은 꼴). 서버로 가지
// 않고 로그아웃에 남습니다(로그아웃하면 세션이 없어 이용권도 없음 — D3). 재설치 · 기기 변경이면 없고 계정 생성 기준으로 돌아갑니다.

import { loadAuthSession } from "../lib/auth-session";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import { welcomePassStartOf, type WelcomePassBasis } from "../lib/welcome-pass";
import { progressUserId } from "./pending-learning-progress";
import {
  deviceSignupRewardStore,
  type SignupRewardRecord,
  type SignupRewardStore,
} from "./signup-reward-record";

export const welcomePassShownStorageKey = (userId: string): string =>
  `libitum.welcome-pass.shown-at.${userId}`;

/** 저장값 → 창이 선 시각(ms). 양의 정수가 아니면 null. 순수. */
export function welcomePassShownFrom(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * 가입 보상 창이 아직 앞에 있나 — 받은 보상의 창을 아직 안 봤으면 참. 지급을 아직 모르면(묻기 전 · 묻기 실패) 튜토리얼 중일
 * 때만 참입니다(그 동안은 티켓을 쓰지 않음). 튜토리얼을 끝냈는데 지급을 모르면 창보다 먼저 레슨이 티켓을 쓸 수 있어 계정 생성
 * 기준으로 둡니다. 순수.
 */
export function signupWindowAhead(
  record: SignupRewardRecord | null,
  tutorialDone: boolean,
): boolean {
  if (record === null) return !tutorialDone;
  return !record.shown && record.amount > 0;
}

export type WelcomePassStore = {
  /** 지금 로그인한 계정의 시작 판정 값 — 비회원이면 생성 시각이 없습니다. */
  readonly read: (tutorialDone: boolean) => WelcomePassBasis;
  /** 창이 처음 선 시각을 적습니다 — 이미 있으면 그대로(창이 다시 서도 늘지 않음). */
  readonly markShown: (atMs: number) => void;
};

const nobody: WelcomePassBasis = { accountCreatedAt: null, shownAtMs: null, windowAhead: false };

/** 기기 저장소 판 — background(효과 · 핸들러)에서만 부릅니다. 가입 보상 기록은 그 결선과 같은 저장소에서 읽습니다. */
export function deviceWelcomePassStore(
  signupStore: SignupRewardStore = deviceSignupRewardStore,
): WelcomePassStore {
  return {
    read: (tutorialDone) => {
      "background only";
      try {
        const accountCreatedAt = welcomePassStartOf(loadAuthSession());
        const userId = progressUserId();
        if (accountCreatedAt === null || userId === null) return nobody;
        const shownAtMs = isStorageAvailable()
          ? welcomePassShownFrom(getItem(welcomePassShownStorageKey(userId)))
          : null;
        return {
          accountCreatedAt,
          shownAtMs,
          windowAhead: signupWindowAhead(signupStore.read(), tutorialDone),
        };
      } catch {
        return nobody;
      }
    },
    markShown: (atMs) => {
      "background only";
      try {
        const userId = progressUserId();
        if (userId === null || !isStorageAvailable()) return;
        const key = welcomePassShownStorageKey(userId);
        if (welcomePassShownFrom(getItem(key)) === null) setItem(key, String(Math.round(atMs)));
      } catch {
        // 적지 못하면 계정 생성 기준으로 돌아갑니다(재설치와 같음) — 화면을 막지 않습니다.
      }
    },
  };
}
