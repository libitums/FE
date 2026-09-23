// 진입 흐름 콜백 열둘을 만듭니다. 토큰 저장·진입 이벤트·전이가 여기 모입니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import { createTemporaryAuthToken, hasAuthToken, saveAuthToken } from "../lib/auth-token";
import {
  entryCompletedEvent,
  entryLoginMethodSelectedEvent,
  entryScreenViewedEvent,
  requiresVerificationCode,
} from "../lib/entry-flow";
import type { EntryEventSink, EntryLoginMethod } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
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
    // 스플래시 시간 종료입니다. 토큰이 있으면(재실행) 이벤트 없이 곧장
    // `enterApp` — 완주가 아닙니다. 없으면 「onboarding」 열람을 올리고
    // `replace`합니다 — 스플래시는 스택에 남지 않습니다.
    onSplashTimeout: () => {
      if (hasAuthToken()) {
        dispatch({ type: "enterApp" });
        return;
      }
      entryEventSink?.(entryScreenViewedEvent("onboarding"));
      dispatch({ type: "replace", screen: { name: "onboarding" } });
    },
    // 온보딩 완료 → 로그인 열람 → push.
    onOnboardingComplete: () => {
      entryEventSink?.(entryScreenViewedEvent("login"));
      dispatch({ type: "push", screen: { name: "login" } });
    },
    // 수단 선택입니다 — 한 tap 안에서 이벤트 → 저장 → 전이 순서입니다. 다음
    // 화면의 열람 이벤트도 이 전이가 여는 것이라 같은 tap 안에서 함께 오릅니다.
    // `requiresVerificationCode`로 다음 화면을 가르는 이유는 `entryScreenAfterLogin`이
    // 돌려주는 값이 `Screen`(넓은 타입)이라 다시 좁히지 않기 위해서입니다 — 이미
    // 있는 판별 함수를 그대로 씁니다.
    onSelectLoginMethod: (method: EntryLoginMethod, phoneNumber?: string) => {
      entryEventSink?.(entryLoginMethodSelectedEvent(method));
      saveAuthToken(createTemporaryAuthToken());
      entryEventSink?.(
        entryScreenViewedEvent(
          requiresVerificationCode(method) ? "verification-code" : "language-select",
        ),
      );
      dispatch({ type: "push", screen: entryScreenAfterLogin(method, phoneNumber) });
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
    // 코드 검증의 `확인`입니다 — 화면이 이미 완성 여부를 걸러 완성일 때만
    // 부릅니다. 여기서 다시 판정하지 않습니다.
    onVerificationCodeSubmit: () => {
      entryEventSink?.(entryScreenViewedEvent("language-select"));
      dispatch({ type: "push", screen: { name: "language-select" } });
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
