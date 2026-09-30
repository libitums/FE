// 실패 이유 → 화면 문구, 단 하나의 자리입니다. 로그인 · 코드 검증 두 화면이 같은 표를
// 씁니다 — 소유 화면이 하나로 정해지지 않아 `lib/`에 둡니다.

import type { AuthFailureReason } from "./auth-session.contract";

/** `default` 없는 `switch`로 여덟 이유 전부를 망라합니다. */
export function authFailureMessage(reason: AuthFailureReason): string {
  switch (reason) {
    case "network": {
      return "Couldn't connect. Check your connection and try again.";
    }
    case "unavailable": {
      return "Something went wrong. Please try again.";
    }
    case "unconfigured": {
      return "Sign-in isn't available right now.";
    }
    case "rate-limited": {
      return "Too many attempts. Please wait a moment and try again.";
    }
    case "rejected": {
      return "We couldn't send a code to this number. Check the number and try again.";
    }
    case "invalid-code": {
      return "The code is incorrect or has expired.";
    }
    case "sign-in-incomplete": {
      return "Sign-in didn't complete. Please try again.";
    }
    case "unsupported": {
      return "This sign-in option isn't available on this device.";
    }
  }
}
