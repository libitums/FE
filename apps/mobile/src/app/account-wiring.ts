// 로그아웃 · 계정 삭제의 결선입니다 — 설정 화면의 콜백 둘을 만들고 뒤처리(세션 삭제 → 분석 되돌리기 →
// `entry_screen_viewed(login)` → App 세션 재시작)를 잇습니다. 어휘는 `leave-app.contract.ts`입니다.

import { clearWordbook } from "../lib/wordbook";
import { forgetGuideRecords } from "../lib/guide-records";
import { authUserIdFrom } from "../lib/auth-user-id";
import { setCrashUser } from "../lib/crash-user";
import { clearGuestSession, loadGuestSession } from "../lib/guest-session";
import { clearLearnerProfileCache } from "../lib/learner-profile-cache";
import { forgetDeviceUnlocks, serverAccountKey } from "../screens/messenger-chat/chat-local-stores";
import { forgetLastSeen } from "../screens/messenger-chat/chat-last-seen-store";
import { clearPendingLearningDays } from "./pending-learning-days";
import { clearCachedProgress } from "./cached-learning-progress";
import { clearPendingProgress } from "./pending-learning-progress";
import { deleteAccount } from "../lib/account-deletion";
import { signOutRemotely } from "../lib/api-client";
import { clearPushPrompt } from "./push-prompt";
import { forgetPushDevice } from "./push-wiring";
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
    // 방어입니다 — 정상 경로에서는 표식이 이미 없어 저장소를 건드리지 않습니다.
    if (loadGuestSession()) clearGuestSession();
    try {
      analyticsUser?.reset(analyticsResetScopeFor(exit));
    } catch {
      // 분석 실패는 뒤처리를 멈추지 않습니다.
    }
    setCrashUser(null); // 오류 수집의 사용자도 지웁니다(ADR-0207 D3). 던지지 않습니다.
    entryEventSink?.(entryScreenViewedEvent("login"));
    leaveApp(exit);
  };

  return {
    onSignOut: () => {
      const session = loadAuthSession();
      if (session !== null) {
        // 본 마지막 인물 메시지(ADR-0213 개정)는 그 계정 것만 지웁니다 — 다시 로그인하면 그때 끝을 본 것으로 시작합니다.
        const userId = authUserIdFrom(session.accessToken);
        if (userId !== null) forgetLastSeen(serverAccountKey(userId));
        // 이 기기가 떠난 사용자의 알림을 받지 않게 먼저 토큰을 뗍니다(ADR-0034). 둘 다 기다리지 않습니다(S7).
        forgetPushDevice(session.accessToken);
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
        const userId = authUserIdFrom(session.accessToken);
        if (userId !== null) {
          clearPendingProgress(userId);
          clearCachedProgress(userId);
          clearPendingLearningDays(userId);
          clearLearnerProfileCache(userId);
          clearWordbook(userId); // 단어장 칸(ADR-0169)
          clearPushPrompt(userId); // 첫 스토리 뒤 알림 질문 표식(ADR-0176)
          // 메신저 해금 기록도 그 계정 것만 지웁니다 — 같은 기기의 다음 계정에 열린 인물이 남지 않게(2026-11-17).
          forgetDeviceUnlocks(serverAccountKey(userId));
          forgetLastSeen(serverAccountKey(userId));
          // 안내 기록(메신저 셋 · 학습 문항)도 그 계정 칸만 지웁니다 — 로그아웃은 남깁니다(2026-11-27, 계정별 칸).
          forgetGuideRecords(userId);
        }
        leave("deleted");
      }
      return result;
    },
  };
}
