// 진입 흐름 공용 어휘 자리입니다. 진입 화면들이 공유하는 이름은 전부 여기 있습니다 —
// `screens/` 사이 값 import를 만들지 않기 위해서입니다(`code.md` 「import」 승격
// 규칙: 화면 셋 이상이 쓰는 어휘). 이 모듈은 `screens/`를 import하지 않습니다.

import type { LearnerProfileSavedEvent } from "./learner-profile.contract";
import type { LegalDocumentOpenedEvent } from "./legal-document.contract";

export type EntryScreenName =
  | "splash"
  | "onboarding"
  | "login"
  | "verification-code"
  | "learner-name"
  | "learner-country"
  | "language-select"
  | "journey-entry"
  | "entry-basics-letters"
  | "entry-basics-compose"
  | "entry-basics-ready"
  | "update-required";

// 스플래시와 강제 업데이트 화면은 `entry_screen_viewed`를 내지 않습니다 — 뒤엣것은 자기 이벤트
// (`app_update_required_shown`)가 따로 있습니다.
export type EntryViewedScreenName = Exclude<EntryScreenName, "splash" | "update-required">;

export type EntryLoginMethod = "phone" | "google" | "apple" | "facebook";

// 화면 순서가 곧 이 순서입니다(phone → apple → google → facebook). 2026-09-21 디자인
// 반영에서 피그마 순서로 바뀌었습니다.
export const entryLoginMethods: readonly EntryLoginMethod[] = [
  "phone",
  "apple",
  "google",
  "facebook",
];

// 로고 끝 신호가 오지 않을 때 그 순간을 대신하는 시각입니다 — 게이지가 없으면 스플래시의
// 최대 체류 시간입니다. 전이는 로고 애니메이션(약 2.4초)이 끝날 때 일어나고, 이 값은
// 애니메이션 길이에 로드 여유를 더한 안전 타이머입니다. 모션 토큰이 아닙니다.
// 화면·테스트가 이 상수를 리터럴로 복제하지 않고 import합니다.
export const entrySplashDurationMs = 4000;

// `default` 없는 switch입니다 — 수단이 늘면 TS2366으로 섭니다.
export function requiresVerificationCode(method: EntryLoginMethod): boolean {
  switch (method) {
    case "phone": {
      return true;
    }
    case "google":
    case "apple":
    case "facebook": {
      return false;
    }
  }
}

export type EntryScreenViewedEvent = {
  readonly name: "entry_screen_viewed";
  readonly screen: EntryViewedScreenName;
};
/** 로그인 화면에서 고른 것 — 수단 넷 + 「비회원으로 계속」(ADR-0111). */
export type EntryLoginChoice = EntryLoginMethod | "guest";
export type EntryLoginMethodSelectedEvent = {
  readonly name: "entry_login_method_selected";
  readonly method: EntryLoginChoice;
};
export type EntryCompletedEvent = { readonly name: "entry_completed" };
export type EntryReturningLearnerEnteredEvent = {
  readonly name: "entry_returning_learner_entered";
  readonly method: EntryLoginMethod;
};
/**
 * 스플래시가 나가는 순간 정책의 최소 빌드보다 낮아 강제 업데이트 화면이 섰습니다(ADR-0086). 숫자는
 * 문자열로 싣습니다 — 분석 속성은 문자열 · 불리언뿐입니다.
 */
export type AppUpdateRequiredEvent = {
  readonly name: "app_update_required_shown";
  readonly platform: string;
  readonly build: string;
  readonly minBuild: string;
};

/** 온보딩 스텝이 처음 보인 길 — 첫 화면 · 자동 넘김 · 밀기 · 뒤로(버튼 · 시스템 뒤로)(ADR-0159). */
export type OnboardingStepVia = "start" | "auto" | "swipe" | "back";
/** 온보딩 스텝 번호(1부터) — 분석 속성은 문자열 · 불리언뿐입니다. */
export type OnboardingStepNumber = "1" | "2" | "3";
/** 온보딩 스텝이 그 방문에서 처음 보였습니다 — 같은 스텝을 다시 보면 내지 않습니다. */
export type OnboardingStepViewedEvent = {
  readonly name: "onboarding_step_viewed";
  readonly step: OnboardingStepNumber;
  readonly via: OnboardingStepVia;
};
/** 「Get started」를 눌렀습니다 — 누른 스텝과 그 전에 자동 넘김이 있었는지입니다. */
export type OnboardingStartedEvent = {
  readonly name: "onboarding_started";
  readonly step: OnboardingStepNumber;
  readonly autoAdvanced: boolean;
};
export type OnboardingEvent = OnboardingStepViewedEvent | OnboardingStartedEvent;

/** 여정 입장의 두 길 — 기초부터 · 바로 입장(ADR-0176). */
export type EntryPath = "basics" | "story";
export type EntryBasicsStep = "letters" | "compose" | "ready";
/** 준비 완료에는 Skip이 없습니다. */
export type EntryBasicsSkippableStep = Exclude<EntryBasicsStep, "ready">;
export type EntryPathSelectedEvent = {
  readonly name: "entry_path_selected";
  readonly path: EntryPath;
};
export type EntryBasicsStepCompletedEvent = {
  readonly name: "entry_basics_step_completed";
  readonly step: EntryBasicsStep;
};
export type EntryBasicsSkippedEvent = {
  readonly name: "entry_basics_skipped";
  readonly step: EntryBasicsSkippableStep;
};

export type EntryEvent =
  | EntryScreenViewedEvent
  | EntryPathSelectedEvent
  | EntryBasicsStepCompletedEvent
  | EntryBasicsSkippedEvent
  | EntryLoginMethodSelectedEvent
  | EntryCompletedEvent
  // 서버에 기록이 있는 계정이 언어 선택 · 여정 입장을 건너뛰고 맵으로 들어간 로그인입니다.
  | EntryReturningLearnerEnteredEvent
  // 강제 업데이트 화면이 선 실행입니다(ADR-0086).
  | AppUpdateRequiredEvent
  // 로그인 화면의 방침 · 약관 링크입니다(ADR-0033). 설정 sink와 같은 모양입니다.
  | LegalDocumentOpenedEvent
  // 가입 직후 ② 나라에서의 저장입니다. 값(이름 · 나라)은 싣지 않습니다.
  | LearnerProfileSavedEvent
  // 온보딩 스텝 열람 · 「Get started」(ADR-0159).
  | OnboardingEvent;
export type EntryEventSink = ((event: EntryEvent) => void) | null;
export type EntryAppProps = { readonly entryEventSink?: EntryEventSink };

export function entryScreenViewedEvent(screen: EntryViewedScreenName): EntryScreenViewedEvent {
  return { name: "entry_screen_viewed", screen };
}

export function entryLoginMethodSelectedEvent(
  method: EntryLoginChoice,
): EntryLoginMethodSelectedEvent {
  return { name: "entry_login_method_selected", method };
}

// 이 이벤트는 매개변수가 없고 필드도 하나뿐이라(`name` 리터럴 하나) 타입이
// 허용하는 값이 이 하나뿐입니다 — "틀린 스텁"을 만들 여지가 타입 자체에 없습니다.
export function entryCompletedEvent(): EntryCompletedEvent {
  return { name: "entry_completed" };
}

export function entryPathSelectedEvent(path: EntryPath): EntryPathSelectedEvent {
  return { name: "entry_path_selected", path };
}

export function entryBasicsStepCompletedEvent(
  step: EntryBasicsStep,
): EntryBasicsStepCompletedEvent {
  return { name: "entry_basics_step_completed", step };
}

export function entryBasicsSkippedEvent(step: EntryBasicsSkippableStep): EntryBasicsSkippedEvent {
  return { name: "entry_basics_skipped", step };
}

export function entryReturningLearnerEnteredEvent(
  method: EntryLoginMethod,
): EntryReturningLearnerEnteredEvent {
  return { name: "entry_returning_learner_entered", method };
}

export function appUpdateRequiredEvent(
  version: { readonly platform: string; readonly build: number },
  minBuild: number,
): AppUpdateRequiredEvent {
  return {
    name: "app_update_required_shown",
    platform: version.platform,
    build: String(version.build),
    minBuild: String(minBuild),
  };
}
