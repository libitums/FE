// 메신저 탭에 누가 들어오나입니다(ADR-0128) — 컴패니언 서버는 계정 없는 손님을 받지 않고, 결제(M4) 전에는 시험 계정만 받는다.

import type { AccountState } from "../../lib/guest-session";

/** open = 지금 목록, sign-in = 손님에게 가입 권유, coming-soon = 시험 계정이 아닌 회원에게 「곧 열림」. */
export type MessengerAccess = "open" | "sign-in" | "coming-soon";

export function messengerAccessOf(account: AccountState, isTester: boolean): MessengerAccess {
  if (account !== "signed-in") return "sign-in";
  return isTester ? "open" : "coming-soon";
}

export type MessengerAccessProps = {
  readonly access: MessengerAccess;
  /** 손님의 「Sign up or log in」 — 설정 탭 Sign in과 같은 흐름. */
  readonly onSignIn: () => void;
};

export const messengerAccessTestIds = {
  gate: "messenger-access-gate",
  signIn: "messenger-access-sign-in",
  journey: "messenger-access-journey",
} as const;

/** 메신저 문구 표의 `access` 칸입니다. */
export type MessengerAccessCopy = {
  readonly signInTitle: string;
  readonly signInBody: string;
  readonly signIn: string;
  readonly comingSoonTitle: string;
  readonly comingSoonBody: string;
};
