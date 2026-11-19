// 메신저 탭에 누가 들어오나입니다(ADR-0128) — 컴패니언 서버는 계정 없는 손님을 받지 않는다. 로그인한 회원은 시험 계정이
// 아니어도 연다(2026-11-17 일반 회원 개방 — 전에는 시험 계정이 아닌 회원에게 「곧 열림」).

import type { AccountState } from "../../lib/guest-session";

/**
 * open = 지금 목록, preview = 비회원 — 회원과 같은 목록 · 방을 보되 보내기 같은 계정 동작은 로그인 권유(ADR-0166),
 * sign-in = 로그아웃(진입 구간)에게 가입 권유 안내.
 */
export type MessengerAccess = "open" | "preview" | "sign-in";

export function messengerAccessOf(account: AccountState): MessengerAccess {
  if (account === "signed-in") return "open";
  return account === "guest" ? "preview" : "sign-in";
}

/** 목록 · 방을 그릴 수 있는가 — open · preview(ADR-0166). */
export function canBrowseChats(access: MessengerAccess): access is "open" | "preview" {
  return access !== "sign-in";
}

export type MessengerAccessProps = {
  readonly access: MessengerAccess;
  /** 손님의 「Sign up or log in」 — 설정 탭 Sign in과 같은 흐름. */
  readonly onSignIn: () => void;
};

/** 방 화면이 받는 비회원 권유 길(ADR-0166) — null · 없음이면 회원(그대로 보냄). */
export type GuestGateProps = { readonly onSignInRequired?: (() => void) | null };

export const messengerAccessTestIds = {
  gate: "messenger-access-gate",
  signIn: "messenger-access-sign-in",
  /** 비회원 로그인 권유 대화상자(ADR-0166). */
  prompt: "messenger-sign-in-prompt",
} as const;

/** 메신저 문구 표의 `access` 칸입니다. */
export type MessengerAccessCopy = {
  readonly signInTitle: string;
  readonly signInBody: string;
  readonly signIn: string;
  /** 비회원 로그인 권유 대화상자(ADR-0166) — 주 단추는 `signIn`. */
  readonly promptTitle: string;
  readonly promptBody: string;
  readonly promptLater: string;
};
