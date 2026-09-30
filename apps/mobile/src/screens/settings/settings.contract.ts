// 설정 화면의 props·이벤트 타입을 소유합니다. 구현·JSX는 두지 않습니다.

import type { AccountActionsProps, AccountActionsTestId } from "./account-actions.contract";
import type { SessionOptionKey } from "../../lib/session-options";
import type { LegalDocument, LegalDocumentOpenedEvent } from "../../lib/legal-document.contract";

// 이동 항목 넷입니다. `profile`은 route 이름과 같은 문자열이라 App이 `push`로 옮기고, 문서
// 둘(`LegalDocument`)은 앱 위 브라우저로 엽니다(ADR-0033) — 설정 탭 스택에 쌓이지 않습니다.
// `notifications`는 알림 권한을 아직 묻지 않았으면 묻고, 물었으면 iOS 설정의 이 앱 페이지를
// 엽니다(ADR-0034) — 역시 스택에 쌓이지 않습니다.
//
// 이동 항목 목록을 props로 따로 받지 않습니다 — 셋은 이 union이 이미 닫았습니다
// (`BottomNavigator`가 세 탭을 모듈 내부 상수로 둔 것과 같은 근거입니다).
export type SettingsNavTarget = "profile" | "notifications" | LegalDocument;

export type SettingsScreenProps = {
  readonly onSelectNavTarget: (target: SettingsNavTarget) => void;
} & AccountActionsProps;

export type SettingsOpenedEvent = { readonly name: "settings_opened" };
export type ProfileOpenedEvent = { readonly name: "profile_opened" };
export type NotificationSettingsOpenedEvent = { readonly name: "notification_settings_opened" };
export type SessionOptionChangedEvent = {
  readonly name: "session_option_changed";
  readonly option: SessionOptionKey;
  readonly value: boolean;
};

export type SettingsEvent =
  | SettingsOpenedEvent
  | ProfileOpenedEvent
  | NotificationSettingsOpenedEvent
  | LegalDocumentOpenedEvent
  | SessionOptionChangedEvent;
export type SettingsEventSink = ((event: SettingsEvent) => void) | null;
export type SettingsAppProps = { readonly settingsEventSink?: SettingsEventSink };

export type SettingsTestId =
  | "settings-screen-title"
  | "settings-screen-scroll"
  | "settings-screen-list"
  | `ui-lynx-settings-group-item-${SettingsNavTarget}`
  | AccountActionsTestId;
