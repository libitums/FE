// 실패 이유 → 화면 문구, 단 하나의 자리입니다. 로그인 · 코드 검증 두 화면이 같은 표를
// 씁니다 — 소유 화면이 하나로 정해지지 않아 `lib/`에 둡니다. 언어별 표는 문구표의 `authFailure`입니다(ADR-0091).

import type { AuthFailureReason } from "./auth-session.contract";

/** 여덟 이유 전부의 문구입니다 — `Record`라 이유가 늘면 `tsc`가 빈칸을 잡습니다. */
export type AuthFailureCopy = Readonly<Record<AuthFailureReason, string>>;

export const authFailureEn: AuthFailureCopy = {
  network: "Couldn't connect. Check your connection and try again.",
  unavailable: "Something went wrong. Please try again.",
  unconfigured: "Sign-in isn't available right now.",
  "rate-limited": "Too many attempts. Please wait a moment and try again.",
  rejected: "We couldn't send a code to this number. Check the number and try again.",
  "invalid-code": "The code is incorrect or has expired.",
  "sign-in-incomplete": "Sign-in didn't complete. Please try again.",
  unsupported: "This sign-in option isn't available on this device.",
};

/** 문구표를 넘기지 않으면 영어입니다. */
export function authFailureMessage(
  reason: AuthFailureReason,
  copy: AuthFailureCopy = authFailureEn,
): string {
  return copy[reason];
}
