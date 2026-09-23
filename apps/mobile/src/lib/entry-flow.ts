// 진입 흐름 공용 어휘 자리입니다. 화면 여섯이 공유하는 이름은 전부 여기 있습니다 —
// `screens/` 사이 값 import를 만들지 않기 위해서입니다(`code.md` 「import」 승격
// 규칙: 화면 셋 이상이 쓰는 어휘). 이 모듈은 `screens/`를 import하지 않습니다.

export type EntryScreenName =
  | "splash"
  | "onboarding"
  | "login"
  | "verification-code"
  | "language-select"
  | "journey-entry";

export type EntryViewedScreenName = Exclude<EntryScreenName, "splash">;

export type EntryLoginMethod = "phone" | "google" | "apple" | "facebook";

// 화면 순서가 곧 이 순서입니다(phone → apple → google → facebook). 2026-09-21 디자인
// 반영에서 피그마 순서로 바뀌었습니다.
export const entryLoginMethods: readonly EntryLoginMethod[] = [
  "phone",
  "apple",
  "google",
  "facebook",
];

// 스플래시의 **최대** 체류 시간입니다. 전이는 로고 애니메이션(약 2.4초)이 끝날 때
// 일어나고, 이 값은 그 신호가 오지 않을 때의 안전 타이머입니다 — 애니메이션
// 길이에 로드 여유를 더했습니다. 모션 토큰이 아닙니다. 화면·테스트가 이 상수를
// 리터럴로 복제하지 않고 import합니다.
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
export type EntryLoginMethodSelectedEvent = {
  readonly name: "entry_login_method_selected";
  readonly method: EntryLoginMethod;
};
export type EntryCompletedEvent = { readonly name: "entry_completed" };

export type EntryEvent =
  | EntryScreenViewedEvent
  | EntryLoginMethodSelectedEvent
  | EntryCompletedEvent;
export type EntryEventSink = ((event: EntryEvent) => void) | null;
export type EntryAppProps = { readonly entryEventSink?: EntryEventSink };

export function entryScreenViewedEvent(screen: EntryViewedScreenName): EntryScreenViewedEvent {
  return { name: "entry_screen_viewed", screen };
}

export function entryLoginMethodSelectedEvent(
  method: EntryLoginMethod,
): EntryLoginMethodSelectedEvent {
  return { name: "entry_login_method_selected", method };
}

// 이 이벤트는 매개변수가 없고 필드도 하나뿐이라(`name` 리터럴 하나) 타입이
// 허용하는 값이 이 하나뿐입니다 — "틀린 스텁"을 만들 여지가 타입 자체에 없습니다.
export function entryCompletedEvent(): EntryCompletedEvent {
  return { name: "entry_completed" };
}
