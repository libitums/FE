// 설정 화면의 props·이벤트 타입을 소유합니다. 구현·JSX는 두지 않습니다.

import type { SessionOptionKey, SessionOptions } from "../../lib/session-options";

// `SettingsNavTarget`이 route 이름과 같은 문자열입니다(`"profile"` · `"terms"`) —
// 우연이 아니라 계약입니다. App이 `push({ name: target })`로 곧장 옮깁니다.
//
// 이동 항목 목록을 props로 따로 받지 않습니다 — 둘은 이 union이 이미 닫았습니다
// (`BottomNavigator`가 세 탭을 모듈 내부 상수로 둔 것과 같은 근거입니다).
export type SettingsNavTarget = "profile" | "terms";
export type SettingsNavLabel = "사용자 프로필" | "개인정보 보호 및 약관";

export type SettingsScreenProps = {
  readonly sessionOptions: SessionOptions;
  readonly onSelectNavTarget: (target: SettingsNavTarget) => void;
  readonly onToggleSessionOption: (key: SessionOptionKey) => void;
};

export type SettingsNavItemProps = {
  readonly target: SettingsNavTarget;
  readonly onSelect: (target: SettingsNavTarget) => void;
};

export type SettingsToggleItemProps = {
  readonly optionKey: SessionOptionKey;
  readonly value: boolean;
  readonly onToggle: (key: SessionOptionKey) => void;
};

export type SettingsOpenedEvent = { readonly name: "settings_opened" };
export type ProfileOpenedEvent = { readonly name: "profile_opened" };
export type TermsOpenedEvent = { readonly name: "terms_opened" };
export type SessionOptionChangedEvent = {
  readonly name: "session_option_changed";
  readonly option: SessionOptionKey;
  readonly value: boolean;
};

export type SettingsEvent =
  | SettingsOpenedEvent
  | ProfileOpenedEvent
  | TermsOpenedEvent
  | SessionOptionChangedEvent;
export type SettingsEventSink = ((event: SettingsEvent) => void) | null;
export type SettingsAppProps = { readonly settingsEventSink?: SettingsEventSink };

export type SettingsTestId =
  | "settings-screen-title"
  | "settings-screen-scroll"
  | "settings-screen-list"
  | `settings-nav-item-${SettingsNavTarget}`
  | `settings-nav-item-label-${SettingsNavTarget}`
  | `settings-toggle-item-${SessionOptionKey}`
  | `settings-toggle-item-label-${SessionOptionKey}`
  | `settings-toggle-item-state-${SessionOptionKey}`;
