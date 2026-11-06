// 비회원 결선입니다(ADR-0111 §2-2) — 순서가 계약입니다. 비회원 구간은 서버 요청 · 식별 · 판정이 0입니다.

import type { Dispatch } from "@lynx-js/react";

import type { AnalyticsUser } from "../lib/analytics-user.contract";
import { authUserIdFrom } from "../lib/auth-user-id";
import {
  entryLoginMethodSelectedEvent,
  entryScreenViewedEvent,
  type EntryEventSink,
} from "../lib/entry-flow";
import { saveGuestSession, type AccountState } from "../lib/guest-session";
import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { oauthProviderFor, signInWithSocialProvider } from "../lib/social-sign-in";
import type { SocialSignInOutcome } from "../lib/social-sign-in.contract";
import type { SocialLoginMethod } from "../screens/login/login.contract";
import { adoptGuestRecords } from "./guest-progress";
import type { NavAction } from "./nav-state";
import { syncPushDevice } from "./push-wiring";
import { storeSignedInSession } from "./store-session";

export type GuestWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly entryEventSink: EntryEventSink;
  readonly analyticsUser: AnalyticsUser | null;
  readonly syncProgress: () => Promise<void>;
  readonly syncLearnerProfile: () => Promise<void>;
  /** 비회원 저장 객체를 세웁니다(`use-journey-progress`). */
  readonly startGuestProgress: () => void;
  readonly setAccountState: (state: AccountState) => void;
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly learnerPort: LearnerProfilePort;
};

export type GuestWiring = {
  /** 로그인 화면 「비회원으로 계속」. 네트워크 0건. */
  readonly onContinueAsGuest: () => void;
  /** 설정 › 계정 동작 「로그인」 행. */
  readonly onSignIn: () => void;
  /** `guest-login` 화면의 소셜 버튼 — 판정 없이 설정으로 돌아옵니다. */
  readonly onSelectGuestSignInMethod: (method: SocialLoginMethod) => Promise<SocialSignInOutcome>;
  /** `guest-login` 화면의 뒤로. */
  readonly onGuestSignInBack: () => void;
};

export function guestWiring(args: GuestWiringArgs): GuestWiring {
  const { dispatch, entryEventSink } = args;
  return {
    // 표식 저장 → 상태 → 비회원 진행 → 선택 이벤트 → ① 이름. 세션 저장 · 식별 · 판정 · 프로필 동기화 · 푸시 0.
    onContinueAsGuest: () => {
      saveGuestSession();
      args.setAccountState("guest");
      args.startGuestProgress();
      entryEventSink?.(entryLoginMethodSelectedEvent("guest"));
      entryEventSink?.(entryScreenViewedEvent("learner-name"));
      const initialName = args.learnerRecord?.name ?? args.learnerPort.randomName(null);
      dispatch({ type: "push", screen: { name: "learner-name", initialName } });
    },
    // 설정 스택 위에 로그인 화면을 엽니다 — 탭 바가 숨습니다.
    onSignIn: () => {
      entryEventSink?.(entryScreenViewedEvent("login"));
      dispatch({ type: "push", screen: { name: "guest-login" } });
    },
    // 성공하면 이관(세션 저장 전) → 세션 저장 → 이벤트 → 프로필 동기화 → 설정 루트 → 알림 질문입니다.
    onSelectGuestSignInMethod: async (method) => {
      const result = await signInWithSocialProvider(oauthProviderFor(method));
      if (result.status !== "signed-in") {
        return result;
      }
      const userId = authUserIdFrom(result.session.accessToken);
      if (userId !== null) {
        adoptGuestRecords(userId);
      }
      storeSignedInSession(result.session, args);
      entryEventSink?.(entryLoginMethodSelectedEvent(method));
      void args.syncLearnerProfile().catch(() => undefined);
      dispatch({ type: "backToRoot" });
      void syncPushDevice({ ask: true });
      return { status: "signed-in" };
    },
    onGuestSignInBack: () => {
      dispatch({ type: "back" });
    },
  };
}
