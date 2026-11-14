// 설정 화면의 props·이벤트 타입을 소유합니다. 구현·JSX는 두지 않습니다.

import type { AccountActionsProps, AccountActionsTestId } from "./account-actions.contract";
import type { AppVersion } from "../../lib/app-version";
import type { AccountState } from "../../lib/guest-session";
import type { SessionOptionKey, SessionOptions } from "../../lib/session-options";
import type {
  LearnerProfileOpenedEvent,
  LearnerProfileSavedEvent,
} from "../../lib/learner-profile.contract";
import type { LegalDocument, LegalDocumentOpenedEvent } from "../../lib/legal-document.contract";

// `profile` · `learner-profile`은 route 이름과 같은 문자열이라 App이 `push`로 옮기고, 문서
// 둘(`LegalDocument`)은 앱 위 브라우저로 엽니다(ADR-0033) — 설정 탭 스택에 쌓이지 않습니다.
// `notifications`는 알림 권한을 아직 묻지 않았으면 묻고, 물었으면 iOS 설정의 이 앱 페이지를
// 엽니다(ADR-0034) — 역시 스택에 쌓이지 않습니다.
//
// 이동 항목 목록을 props로 따로 받지 않습니다 — 셋은 이 union이 이미 닫았습니다
// (`BottomNavigator`가 세 탭을 모듈 내부 상수로 둔 것과 같은 근거입니다).
/** 설정 화면이 받는 계정 상태 — 설정은 앱 구간이라 `signed-out`은 오지 않습니다. */
export type SettingsAccountState = Exclude<AccountState, "signed-out">;

export type SettingsNavTarget =
  | "profile"
  | "learner-profile"
  // UI 언어를 바꾸는 화면(ADR-0093) — 진입 흐름의 언어 선택 화면을 설정 탭 스택에 다시 씁니다.
  | "language"
  // 콘텐츠 받기 설정(ADR-0095 D8) — 설정 탭 스택에 쌓는 화면입니다.
  | "download"
  | "notifications"
  | "feedback"
  | LegalDocument;

export type SettingsSessionOptionKey = Extract<
  SessionOptionKey,
  "show-choice-romanization" | "vibration"
>;

export type SettingsScreenProps = {
  readonly onSelectNavTarget: (target: SettingsNavTarget) => void;
  /** 「Name and country in lessons」 줄의 설명입니다 — 지금 값 · `Not set` · 기기에만 저장됨. */
  readonly learnerProfileSummary: string;
  /** 「Language」 줄의 설명 — 지금 UI 언어의 이름입니다. */
  readonly languageSummary: string;
  /** 목록 끝 `Version 1.0 (11)` 줄입니다(ADR-0086). 호스트가 안 보내면(Explorer · 테스트) `null`이고 줄이 없습니다. */
  readonly appVersion: AppVersion | null;
  /** 지금 세션 옵션 값입니다. 설정에 서는 줄의 켬 상태가 여기서 나옵니다. */
  readonly sessionOptions: SessionOptions;
  /** 옵션 줄을 눌렀을 때 부릅니다. `value`는 바뀐 뒤 값입니다. */
  readonly onToggleSessionOption: (key: SessionOptionKey, value: boolean) => void;
  /** 행 구성을 고릅니다 — 계정 묶음은 `settingsNavTargetsFor`, 계정 동작은 `accountActionsFor`. */
  readonly account: SettingsAccountState;
  /** 「Chats」 줄 — 대화 설정 화면을 엽니다(ADR-0126). 분석 이벤트가 없어 내비 대상 목록과 따로 둡니다. 메신저를 쓸 수 없는 계정(ADR-0128)이면 null — 줄이 없습니다. */
  readonly onOpenChatSettings: (() => void) | null;
  /** 「Plans」 줄 — 요금제 비교 화면을 엽니다(ADR-0144). 기능 플래그가 꺼졌거나 비회원이면 없음(undefined · null) — 줄이 없습니다. */
  readonly onOpenPlans?: (() => void) | null;
} & AccountActionsProps;

export type SettingsOpenedEvent = { readonly name: "settings_opened" };
export type ProfileOpenedEvent = { readonly name: "profile_opened" };
export type LanguageSettingsOpenedEvent = { readonly name: "language_settings_opened" };
export type DownloadSettingsOpenedEvent = { readonly name: "download_settings_opened" };
export type NotificationSettingsOpenedEvent = { readonly name: "notification_settings_opened" };
export type FeedbackOpenedEvent = { readonly name: "feedback_opened" };
/** 설정에서 피드백을 보냈습니다(성공한 것만). 글은 싣지 않습니다(ADR-0036). */
export type FeedbackSubmittedEvent = {
  readonly name: "feedback_submitted";
  readonly rating: string;
  readonly hasMessage: boolean;
};
export type SessionOptionChangedEvent = {
  readonly name: "session_option_changed";
  readonly option: SessionOptionKey;
  readonly value: boolean;
};

export type SettingsEvent =
  | SettingsOpenedEvent
  | ProfileOpenedEvent
  | LanguageSettingsOpenedEvent
  | DownloadSettingsOpenedEvent
  | NotificationSettingsOpenedEvent
  | FeedbackOpenedEvent
  | FeedbackSubmittedEvent
  | LegalDocumentOpenedEvent
  | SessionOptionChangedEvent
  | LearnerProfileSavedEvent
  | LearnerProfileOpenedEvent;
export type SettingsEventSink = ((event: SettingsEvent) => void) | null;
export type SettingsAppProps = { readonly settingsEventSink?: SettingsEventSink };

export type SettingsTestId =
  | "settings-screen-title"
  | "settings-screen-scroll"
  | "settings-screen-list"
  | "settings-screen-version"
  | `ui-lynx-settings-group-item-${SettingsNavTarget}`
  | `ui-lynx-settings-group-item-${SettingsSessionOptionKey}`
  | AccountActionsTestId;
