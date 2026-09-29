// 진입 흐름 콜백 열둘을 만듭니다. 토큰 저장·진입 이벤트·전이가 여기 모입니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { refreshAuthSession, requestPhoneOtp, verifyPhoneOtp } from "../lib/api-client";
import {
  clearAuthSession,
  entryAuthStateFrom,
  loadAuthSession,
  saveAuthSession,
  sessionRefreshDisposition,
} from "../lib/auth-session";
import { createTemporaryAuthToken, hasAuthToken, saveAuthToken } from "../lib/auth-token";
import {
  entryCompletedEvent,
  entryLoginMethodSelectedEvent,
  entryScreenViewedEvent,
} from "../lib/entry-flow";
import type { EntryEventSink } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
  PhoneOtpVerifyRequest,
} from "../lib/auth-session.contract";
import type { SocialLoginMethod } from "../screens/login/login.contract";
import type { NavAction } from "./nav-state";
import { entryScreenAfterLogin } from "./screen-routing";

export type EntryWiringArgs = {
  readonly entryEventSink: EntryEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly entryLanguage: EntryLanguage;
  readonly setEntryLanguage: Dispatch<SetStateAction<EntryLanguage>>;
};

export function entryWiring({
  entryEventSink,
  dispatch,
  entryLanguage,
  setEntryLanguage,
}: EntryWiringArgs) {
  return {
    // 스플래시 시간 종료입니다. 세션이 있으면(`refresh`) 갱신을
    // 시도하는 동안 스플래시가 그대로 섭니다. 세션이 없고 임시 토큰만
    // 있으면(`temporary`, 재실행) 이벤트 없이 곧장 `enterApp` — 완주가
    // 아닙니다. 둘 다 없으면(`none`) 「onboarding」 열람을 올리고
    // `replace`합니다 — 스플래시는 스택에 남지 않습니다.
    onSplashTimeout: () => {
      const authState = entryAuthStateFrom(loadAuthSession(), hasAuthToken());
      switch (authState.kind) {
        case "temporary": {
          dispatch({ type: "enterApp" });
          return;
        }
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
              saveAuthSession(result.session);
              dispatch({ type: "enterApp" });
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
    // 온보딩 완료 → 로그인 열람 → push.
    onOnboardingComplete: () => {
      entryEventSink?.(entryScreenViewedEvent("login"));
      dispatch({ type: "push", screen: { name: "login" } });
    },
    // 소셜 셋 선택입니다 — 이벤트 → 임시 토큰 저장 → 이벤트 → push. 「검증 전에는 아무것도
    // 저장하지 않는다」는 전화번호 갈래의 규칙이라 소셜 셋에는 적용되지 않습니다.
    onSelectSocialLoginMethod: (method: SocialLoginMethod) => {
      entryEventSink?.(entryLoginMethodSelectedEvent(method));
      saveAuthToken(createTemporaryAuthToken());
      entryEventSink?.(entryScreenViewedEvent("language-select"));
      dispatch({ type: "push", screen: entryScreenAfterLogin({ method }) });
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
        saveAuthSession(result.session);
        entryEventSink?.(entryScreenViewedEvent("language-select"));
        dispatch({ type: "push", screen: { name: "language-select" } });
        return { status: "verified" };
      }
      return result;
    },
    // 로그인의 뒤로가기입니다 — 진입 구간 스택에서 한 칸 뒤(온보딩)로 갑니다.
    onLoginBack: () => {
      dispatch({ type: "back" });
    },
    // 언어 선택의 뒤로가기입니다 — 진입 스택에서 한 칸 뒤(코드 검증 또는
    // 로그인)로 갑니다.
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
    onContinueLanguageSelect: () => {
      entryEventSink?.(entryScreenViewedEvent("journey-entry"));
      dispatch({ type: "push", screen: { name: "journey-entry" } });
    },
    // 여정 입장의 `여정 시작하기`입니다 — 완주 이벤트 → `enterApp`. 이 진입
    // 구간을 비우는 순간이 바텀 네비게이션이 처음 보이는 순간입니다.
    onEnterJourney: () => {
      entryEventSink?.(entryCompletedEvent());
      dispatch({ type: "enterApp" });
    },
  };
}
