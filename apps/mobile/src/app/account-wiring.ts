// 로그아웃 · 계정 삭제의 결선입니다 — 설정 화면의 콜백 둘을 만들고 뒤처리(세션 삭제 → 분석 되돌리기 →
// `entry_screen_viewed(login)` → App 세션 재시작)를 잇습니다. 어휘는 `leave-app.contract.ts`입니다.

import { deleteAccount } from "../lib/account-deletion";
import { signOutRemotely } from "../lib/api-client";
import { entryScreenViewedEvent } from "../lib/entry-flow";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../lib/auth-session";
import type {
  AccountExit,
  AccountWiring,
  AccountWiringArgs,
  AnalyticsResetScopeFor,
} from "./leave-app.contract";

/** `signed-out` → `identity`, `deleted` → `identity-and-queue`. */
export const analyticsResetScopeFor: AnalyticsResetScopeFor = (exit) => {
  switch (exit) {
    case "signed-out": {
      return "identity";
    }
    case "deleted": {
      return "identity-and-queue";
    }
  }
};

export function accountWiring({
  analyticsUser,
  entryEventSink,
  leaveApp,
}: AccountWiringArgs): AccountWiring {
  const leave = (exit: AccountExit): void => {
    clearAuthSession();
    try {
      analyticsUser?.reset(analyticsResetScopeFor(exit));
    } catch {
      // 분석 실패는 뒤처리를 멈추지 않습니다.
    }
    entryEventSink?.(entryScreenViewedEvent("login"));
    leaveApp(exit);
  };

  return {
    onSignOut: () => {
      const session = loadAuthSession();
      if (session !== null) {
        // 시작만 하고 기다리지 않습니다(S7).
        void signOutRemotely(session.accessToken);
      }
      leave("signed-out");
    },
    onDeleteAccount: async () => {
      const session = loadAuthSession();
      if (session === null) {
        return { status: "failed", reason: "session-expired" };
      }
      const result = await deleteAccount(session, saveAuthSession);
      if (result.status === "deleted") {
        leave("deleted");
      }
      return result;
    },
  };
}
