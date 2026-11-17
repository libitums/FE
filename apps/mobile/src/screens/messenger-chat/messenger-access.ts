// 메신저 탭에 누가 들어오나입니다(ADR-0128) — 컴패니언 서버는 계정 없는 손님을 받지 않는다. 로그인한 회원은 시험 계정이
// 아니어도 연다(2026-11-17 일반 회원 개방 — 전에는 시험 계정이 아닌 회원에게 「곧 열림」).

import type { AccountState } from "../../lib/guest-session";

/** open = 지금 목록, sign-in = 손님 · 로그아웃에게 가입 권유. */
export type MessengerAccess = "open" | "sign-in";

export function messengerAccessOf(account: AccountState): MessengerAccess {
  return account === "signed-in" ? "open" : "sign-in";
}

export type MessengerAccessProps = {
  readonly access: MessengerAccess;
  /** 손님의 「Sign up or log in」 — 설정 탭 Sign in과 같은 흐름. */
  readonly onSignIn: () => void;
};

export const messengerAccessTestIds = {
  gate: "messenger-access-gate",
  signIn: "messenger-access-sign-in",
} as const;

/** 메신저 문구 표의 `access` 칸입니다. */
export type MessengerAccessCopy = {
  readonly signInTitle: string;
  readonly signInBody: string;
  readonly signIn: string;
};
