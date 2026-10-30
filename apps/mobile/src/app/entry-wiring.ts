// 진입 흐름 콜백을 만듭니다. 토큰 저장·진입 이벤트·전이가 여기 모입니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnalyticsUser } from "../lib/analytics-user.contract";
import { refreshAuthSession, requestPhoneOtp, verifyPhoneOtp } from "../lib/api-client";
import { appUpdateDecision, loadStoredAppPolicy } from "../lib/app-policy";
import { openAppStore } from "../lib/app-update";
import type { AppUpdateStoreOutcome } from "../lib/app-update.contract";
import type { AppVersion } from "../lib/app-version";
import {
  clearAuthSession,
  entryAuthStateFrom,
  loadAuthSession,
  saveAuthSession,
  sessionRefreshDisposition,
} from "../lib/auth-session";
import { authDisplayNameFrom, authUserIdFrom } from "../lib/auth-user-id";
import { legalDocumentOpenedEvent, openLegalDocument } from "../lib/legal-document";
import type { LegalDocument } from "../lib/legal-document.contract";
import {
  appUpdateRequiredEvent,
  entryCompletedEvent,
  entryLoginMethodSelectedEvent,
  entryReturningLearnerEnteredEvent,
  entryScreenViewedEvent,
} from "../lib/entry-flow";
import type { EntryEventSink, EntryLoginMethod } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import { learnerProfileSavedEvent, sameLearnerProfile } from "../lib/learner-profile";
import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import { loadReturningUiLanguage, saveUiLanguage } from "../lib/ui-language";
import type {
  AuthSession,
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
  PhoneOtpVerifyRequest,
} from "../lib/auth-session.contract";
import { oauthProviderFor, signInWithSocialProvider } from "../lib/social-sign-in";
import type { SocialSignInOutcome } from "../lib/social-sign-in.contract";
import type { SocialLoginMethod } from "../screens/login/login.contract";
import type { NavAction } from "./nav-state";
import { syncPushDevice } from "./push-wiring";
import { probeEntryRouteAfterLogin } from "./returning-learner-probe";
import { entryScreenAfterLogin } from "./screen-routing";

export type EntryWiringArgs = {
  readonly entryEventSink: EntryEventSink;
  /** 호스트가 보낸 앱 버전 — 스플래시가 나가는 순간의 강제 업데이트 판정(ADR-0086). 모르면 막지 않습니다. */
  readonly appVersion: AppVersion | null;
  readonly analyticsUser: AnalyticsUser | null;
  readonly dispatch: Dispatch<NavAction>;
  readonly entryLanguage: EntryLanguage;
  readonly setEntryLanguage: Dispatch<SetStateAction<EntryLanguage>>;
  // 로그인 뒤 서버 진행을 불러와 합칩니다(ADR-0035). 기다리지 않습니다 — 실패해도 진입은 이어집니다.
  readonly syncProgress: () => Promise<void>;
  // 가입 직후 ① 이름 · ② 나라 화면의 결과를 담고, 로그인 뒤 서버와 맞춥니다. 던지지 않습니다.
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly learnerPort: LearnerProfilePort;
  readonly saveLearnerProfile: (record: LearnerProfileRecord) => unknown;
  readonly syncLearnerProfile: () => Promise<void>;
};

/** 가입 직후 ① 이름 · ② 나라 화면의 콜백 셋입니다(ADR-0059 D7 2026-10-20). */
export type LearnerSignupWiring = {
  readonly onContinueLearnerName: (name: string) => void;
  readonly onContinueLearnerCountry: (record: LearnerProfileRecord) => void;
  readonly onLearnerProfileStepBack: () => void;
};

export function entryWiring({
  entryEventSink,
  appVersion,
  analyticsUser,
  dispatch,
  entryLanguage,
  setEntryLanguage,
  syncProgress,
  learnerRecord,
  learnerPort,
  saveLearnerProfile,
  syncLearnerProfile,
}: EntryWiringArgs) {
  // 세션을 저장한 자리마다 그 사용자로 분석을 식별합니다(ADR-0029 D8). 저장한 세션에는 사용자
  // ID가 없어 손에 든 액세스 토큰에서 읽습니다. 못 읽으면 식별하지 않고, 식별의 실패는 로그인을
  // 막지 않습니다.
  const storeSession = (session: AuthSession) => {
    saveAuthSession(session);
    void syncProgress().catch(() => undefined);
    const userId = authUserIdFrom(session.accessToken);
    if (userId === null) return;
    try {
      analyticsUser?.identify(userId);
    } catch {
      // 분석은 화면을 막지 않습니다.
    }
  };

  // 로그인 직후 기존 회원인지 판정하고 갈래를 탑니다. 프로필 동기화는 판정 뒤에 시작해, 손님
  // 프로필 업로드가 판정 조회보다 먼저 서버 행을 만들어 신규 사용자를 오판하지 않게 합니다.
  const routeAfterLogin = async (method: EntryLoginMethod): Promise<void> => {
    const route = await probeEntryRouteAfterLogin();
    void syncLearnerProfile().catch(() => undefined);
    switch (route) {
      case "journey-map": {
        const language = loadReturningUiLanguage();
        saveUiLanguage(language);
        setEntryLanguage(language);
        entryEventSink?.(entryReturningLearnerEnteredEvent(method));
        dispatch({ type: "enterApp" });
        void syncPushDevice({ ask: true });
        return;
      }
      // 새 사용자는 언어 선택 앞에 ① 이름 → ② 나라를 지납니다(ADR-0059 D7 2026-10-20). 이름 칸은 이 기기에 남은
      // 값 → 소셜 로그인의 표시 이름 → 무작위 이름 순으로 미리 채웁니다.
      case "language-select": {
        const session = loadAuthSession();
        const initialName =
          learnerRecord?.name ??
          (session === null ? null : authDisplayNameFrom(session.accessToken)) ??
          learnerPort.randomName(null);
        entryEventSink?.(entryScreenViewedEvent("learner-name"));
        dispatch({ type: "push", screen: { name: "learner-name", initialName } });
        return;
      }
    }
  };

  return {
    // 스플래시 시간 종료입니다. 세션이 있으면(`refresh`) 갱신을
    // 시도하는 동안 스플래시가 그대로 섭니다. 세션이 없으면(`none`)
    // 「onboarding」 열람을 올리고 `replace`합니다 — 스플래시는 스택에
    // 남지 않습니다.
    onSplashTimeout: () => {
      // 강제 업데이트가 먼저입니다(ADR-0086) — 기기에 저장된 마지막 정책(이 실행에서 받았으면 그것)으로 판정하고,
      // 막히면 세션 갱신 · 앱 진입을 하지 않습니다. 버전을 모르면(Explorer · 테스트) 막지 않습니다.
      const policy = loadStoredAppPolicy();
      if (appUpdateDecision(appVersion, policy) === "required" && appVersion !== null) {
        const minBuild = policy?.minBuild[appVersion.platform] ?? appVersion.build;
        entryEventSink?.(appUpdateRequiredEvent(appVersion, minBuild));
        dispatch({ type: "replace", screen: { name: "update-required" } });
        return;
      }
      const authState = entryAuthStateFrom(loadAuthSession());
      switch (authState.kind) {
        case "none": {
          entryEventSink?.(entryScreenViewedEvent("onboarding"));
          dispatch({ type: "replace", screen: { name: "onboarding" } });
          return;
        }
        case "refresh": {
          // `refresh`는 `entry_*` 이벤트를 내지 않습니다(성공은 완주가
          // 아니고, 실패는 온보딩을 보지 않았으므로 그 열람을 내지 않습니다).
          void refreshAuthSession(authState.refreshToken).then((result) => {
            if (result.status === "refreshed") {
              storeSession(result.session);
              void syncLearnerProfile().catch(() => undefined);
              dispatch({ type: "enterApp" });
              // 이미 허용했으면 조용히 토큰을 올립니다 — 마지막 활동 시각도 이때 갱신됩니다(ADR-0034).
              void syncPushDevice({ ask: false });
              return;
            }
            if (sessionRefreshDisposition(result.reason) === "clear") {
              clearAuthSession();
            }
            entryEventSink?.(entryScreenViewedEvent("login"));
            // 로그인의 뒤로가기가 온보딩에 닿도록 진입 스택을
            // `[온보딩, 로그인]`으로 만듭니다 — `backToRoot`가 아닌
            // `back`으로 온보딩에 닿아야 합니다.
            dispatch({ type: "replace", screen: { name: "onboarding" } });
            dispatch({ type: "push", screen: { name: "login" } });
          });
          return;
        }
      }
    },
    // 온보딩 완료 → 로그인 열람 → push. 온보딩은 기능을 맛보는 카드뿐이라 넘길 값이 없습니다.
    onOnboardingComplete: () => {
      entryEventSink?.(entryScreenViewedEvent("login"));
      dispatch({ type: "push", screen: { name: "login" } });
    },
    // ① 이름의 Continue — 친 이름을 이 route에 남겨(② 나라에서 뒤로 오면 그대로 서도록) ② 나라로 갑니다.
    onContinueLearnerName: (name: string) => {
      dispatch({ type: "replace", screen: { name: "learner-name", initialName: name } });
      entryEventSink?.(entryScreenViewedEvent("learner-country"));
      dispatch({ type: "push", screen: { name: "learner-country", learnerName: name } });
    },
    // ② 나라의 Continue — 여기서 저장합니다(로그인 뒤라 서버 동기화로 바로 갑니다). 같은 값이면 저장도 이벤트도
    // 아닙니다. 그다음 ③ 언어 선택입니다.
    onContinueLearnerCountry: (record: LearnerProfileRecord) => {
      if (!sameLearnerProfile(learnerRecord, record)) {
        saveLearnerProfile(record);
        entryEventSink?.(learnerProfileSavedEvent("signup", learnerRecord));
      }
      entryEventSink?.(entryScreenViewedEvent("language-select"));
      dispatch({ type: "push", screen: { name: "language-select" } });
    },
    // ① · ② 의 뒤로가기입니다 — 진입 스택에서 한 칸 뒤(로그인 · 코드 검증 · ①)로 갑니다.
    onLearnerProfileStepBack: () => {
      dispatch({ type: "back" });
    },
    // 소셜 셋 선택입니다 — `signInWithSocialProvider`가 창 · 교환을 끝까지 진
    // 뒤, `signed-in`일 때만 **저장 → 이벤트 → 전이** 순서로 잇습니다. 그 밖(`cancelled` · `failed`)은 결과를 그대로
    // 돌려줄 뿐 저장 · 이벤트 · 전이가 0입니다 — 문구 · 발화는 `LoginScreen`이
    // 집니다.
    onSelectSocialLoginMethod: async (method: SocialLoginMethod): Promise<SocialSignInOutcome> => {
      const result = await signInWithSocialProvider(oauthProviderFor(method));
      if (result.status === "signed-in") {
        storeSession(result.session);
        entryEventSink?.(entryLoginMethodSelectedEvent(method));
        await routeAfterLogin(method);
        return { status: "signed-in" };
      }
      return result;
    },
    // 전화번호 제출입니다 — `api-client.requestPhoneOtp`를 부르고,
    // 성공(`sent`)일 때만 수단 선택 · 코드 화면 열람을 올리고 그 화면으로
    // `push`합니다. **저장소에는 아무것도 쓰지 않습니다** — 토큰 저장은
    // 검증 성공 뒤로 옮겨 갔습니다. 실패는 결과를 그대로 돌려주고, 문구 ·
    // 발화는 `LoginScreen`이 집니다.
    onRequestPhoneOtp: async (phone: PhoneNumber): Promise<PhoneOtpRequestResult> => {
      const result = await requestPhoneOtp(phone);
      if (result.status === "sent") {
        entryEventSink?.(entryLoginMethodSelectedEvent("phone"));
        entryEventSink?.(entryScreenViewedEvent("verification-code"));
        dispatch({
          type: "push",
          screen: entryScreenAfterLogin({ method: "phone", phoneNumber: phone }),
        });
      }
      return result;
    },
    // 재전송입니다 — `requestPhoneOtp` 그대로이고 이벤트를 내지
    // 않습니다. 되돌림(회차 · 카운트다운 · 입력)은 `VerificationCodeScreen`이
    // 응답을 받은 뒤에 합니다.
    onResendPhoneOtp: (phone: PhoneNumber): Promise<PhoneOtpRequestResult> => {
      return requestPhoneOtp(phone);
    },
    // 코드 검증입니다 — 성공하면 **저장 → 이벤트 → 전이** 순서로
    // 세션을 저장하고 언어 선택으로 옮겨 갑니다. 화면에는 세션을 내려보내지
    // 않습니다(`PhoneOtpVerifyOutcome`에 `session`이 없습니다). 실패는 결과를
    // 그대로 돌려줍니다.
    onVerifyPhoneOtp: async (request: PhoneOtpVerifyRequest): Promise<PhoneOtpVerifyOutcome> => {
      const result = await verifyPhoneOtp(request);
      if (result.status === "verified") {
        storeSession(result.session);
        await routeAfterLogin("phone");
        return { status: "verified" };
      }
      return result;
    },
    // 로그인의 뒤로가기입니다 — 진입 구간 스택에서 한 칸 뒤(온보딩)로 갑니다.
    // 로그인 안내의 방침 · 약관입니다 — 이벤트 → 앱 위 브라우저(ADR-0033). 화면은 그대로입니다.
    onOpenLegalDocument: (document: LegalDocument) => {
      entryEventSink?.(legalDocumentOpenedEvent(document, "login"));
      openLegalDocument(document);
    },
    // 강제 업데이트 화면의 `Update`입니다(ADR-0086). 호스트가 스토어 페이지를 열고 결과를 돌려줍니다.
    onOpenAppStore: (): Promise<AppUpdateStoreOutcome> => openAppStore(),
    onLoginBack: () => {
      dispatch({ type: "back" });
    },
    // 언어 선택의 뒤로가기입니다 — 진입 스택에서 한 칸 뒤(② 나라)로 갑니다.
    onLanguageSelectBack: () => {
      dispatch({ type: "back" });
    },
    // 여정 입장의 뒤로가기입니다 — 언어 선택으로 돌아갑니다.
    onJourneyEntryBack: () => {
      dispatch({ type: "back" });
    },
    // 코드 검증의 `로그인으로`입니다 — `back`입니다(`backToRoot`가 아닙니다).
    // 새 열람이 아니라 이벤트를 올리지 않습니다.
    onVerificationCodeExit: () => {
      dispatch({ type: "back" });
    },
    entryLanguage,
    // 언어 선택은 이벤트를 만들지 않습니다 — 세션 상태만 바뀝니다.
    onSelectEntryLanguage: (language: EntryLanguage) => {
      setEntryLanguage(language);
    },
    // 언어 선택의 `다음`입니다 — 여정 입장 열람 → push.
    // 확정할 때 UI 언어를 저장합니다 — 재실행 · 재방문에도 남습니다. 고를 때가 아닌 이유: 이미 선택된
    // 항목을 다시 누르면 OptionSelector가 onChange를 내지 않아, 기본 선택(영어)은 저장될 길이 없다.
    onContinueLanguageSelect: () => {
      saveUiLanguage(entryLanguage);
      entryEventSink?.(entryScreenViewedEvent("journey-entry"));
      dispatch({ type: "push", screen: { name: "journey-entry" } });
    },
    // 여정 입장의 `여정 시작하기`입니다 — 완주 이벤트 → `enterApp`. 이 진입
    // 구간을 비우는 순간이 바텀 네비게이션이 처음 보이는 순간입니다.
    onEnterJourney: () => {
      entryEventSink?.(entryCompletedEvent());
      dispatch({ type: "enterApp" });
      // 진입 흐름의 끝에서 알림을 묻습니다 — 다이얼로그는 맵 위에 뜨고, 답을 기다리지 않습니다(ADR-0034).
      void syncPushDevice({ ask: true });
    },
  };
}
