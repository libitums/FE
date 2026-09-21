// LIB-259 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-259/spec.md §2.3(순수 타입 계약). 이 파일은
// `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시 정의하지 않는다.
//
// `SettingsNavTarget`이 route 이름과 같은 문자열이다(`"profile"` · `"terms"`) —
// 우연이 아니라 계약이다. App이 `push({ name: target })`로 곧장 옮긴다(§2.11).
//
// 이동 항목 목록을 props로 받지 않는다 — 둘은 `SettingsNavTarget` union이 이미
// 닫았다(`BottomNavigator`가 세 탭을 모듈 내부 상수로 둔 것과 같은 근거).

import type { SessionOptionKey, SessionOptions } from "../../lib/session-options";

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
