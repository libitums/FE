// `ScreenWiring` 타입을 선언하고, 부분 팩토리(`journeyWiring`·`entryWiring`·`catalogWiring` 등)를
// 합쳐 하나의 wiring을 만듭니다.

import type { AccountWiringArgs } from "./leave-app.contract";
import type { Dispatch, SetStateAction } from "@lynx-js/react";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { AppUpdateStoreOutcome } from "../lib/app-update.contract";
import type { AppVersion } from "../lib/app-version";
import type { SafeAreaInsets } from "../lib/safe-area";
import { accountWiring } from "./account-wiring";
import { catalogWiring } from "./catalog-wiring";
import { learnerProfileWiring, type LearnerProfileWiring } from "./learner-profile-wiring";
import type { LearnerProfileControls } from "./use-learner-profile";
import type { CatalogWiring, CatalogWiringArgs } from "./catalog-wiring";
import type { AccountWiring } from "./leave-app.contract";

import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
  PhoneOtpVerifyRequest,
} from "../lib/auth-session.contract";
import type { FeedbackScreenProps } from "../screens/feedback/feedback.contract";
import type { JourneyStats, ProgressWiringArgs, StatBumpWiring } from "./learning-progress";
import type { JourneyMapProgressLoad } from "../screens/journey-map/journey-map-load.contract";
import type { AnalyticsUser } from "../lib/analytics-user.contract";
import type { LegalDocument } from "../lib/legal-document.contract";
import type { EntryEventSink } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import type { SocialSignInOutcome } from "../lib/social-sign-in.contract";
import type { PhoneSignInVisibility, SocialLoginMethod } from "../screens/login/login.contract";
import type {
  NotificationEventSink,
  NotificationItem,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import type {
  RoleplayEpisodeId,
  RoleplayItem,
  RoleplaySection,
} from "../screens/roleplay-list/roleplay-list.contract";
import type { SettingsEventSink, SettingsNavTarget } from "../screens/settings/settings.contract";
import type { SessionOptions } from "../lib/session-options";
import type { NavAction } from "./nav-state";
import { entryWiring, type LearnerSignupWiring } from "./entry-wiring";
import { journeyWiring } from "./journey-wiring";

// 화면 결선이 `renderScreen`에 넘기는 것입니다. 셸이 소유한 값 하나와 콜백 셋입니다.
//
// **`dispatch`도 `NavAction`도 여기 들어가지 않습니다** — 화면은 스택을
// 모릅니다(ADR-0007 D3). 화면이 받는 것은 "무엇이 일어났다"는 콜백뿐이고,
// 그것을 무슨 네비게이션 동작으로 옮길지는 `App`이 정합니다.
export type ScreenWiring = {
  journeyMapProgressLoad: JourneyMapProgressLoad;
  /** 옛 튜토리얼 최종 테스트를 통과한 기록이 있는가 — 튜토리얼 다음 구획의 문 입력입니다. */
  legacyTutorialPassed: boolean;
  // 롤플레이 목록 항목 선택입니다. 열림 이벤트(출처 `roleplay`) → `push(roleplayScreenFor(item))`.
  onStartRoleplayUnit: (item: RoleplayItem) => void;
  // 롤플레이 화면의 구획입니다 — 어느 에피소드가 열렸는지까지 진행에서 파생한 값입니다.
  // `전체 보기`는 그 에피소드의 화면을 push하고, 그 화면의 나가기는 `back`입니다.
  roleplaySections: readonly RoleplaySection[];
  onViewAllRoleplayEpisode: (episodeId: RoleplayEpisodeId) => void;
  onExitRoleplayEpisode: () => void;
  // 여정 맵 머리 알림 버튼 · 알림 항목 선택 · 알림 화면 나가기입니다(`dispatch` 없음 — 위 원칙 그대로).
  onOpenNotifications: () => void;
  // `notifications`는 남아 있는 알림이고, 삭제는 그 목록에서 하나를 뺍니다.
  notifications: readonly NotificationItem[];
  onSelectNotification: (item: NotificationItem) => void;
  onDeleteNotification: (item: NotificationItem) => void;
  onExitNotifications: () => void;
  // 누른 서버 푸시의 목적지로 갑니다(ADR-0034). 화면이 아니라 `useOpenedPush`가 부릅니다.
  onOpenPushTarget: (target: PushNotificationTarget) => void;
  // 호스트가 넘긴 가장자리 여백입니다. 셸이 여백을 잡지 않는 화면(서사 표지)이 자기
  // 안에서 잡을 때 씁니다 — 콜백이 아니라 값이지만 `sessionOptions`와 같이 내려갑니다.
  safeAreaInsets: SafeAreaInsets;
  // 가진 젬 수입니다. 전역 머리가 아닌 자리(학습 화면의 상단 바 · 학습 완료의 지표 칩)도
  // 같은 값을 그리도록 값으로 내려갑니다.
  gemCount: number;
  // 로그인에 전화번호 수단을 그릴지입니다(`productPhoneSignIn` — 지금은 숨깁니다).
  phoneSignIn: PhoneSignInVisibility;
  // 탭 루트 화면이 자기 안에 겹침 레이어(여정의 스텝 말풍선 · 롤플레이의 플러스 안내)를
  // 열고 닫을 때 부릅니다. 레이어가 떠 있는 동안 전역 머리를 낭독에서 가립니다
  // (ADR-0016 D9) — 머리는 화면 밖(셸)에 있어 화면이 스스로 가릴 수 없습니다.
  onScreenLayerChange: (open: boolean) => void;
  // 세션 옵션의 진실의 출처와 설정 탭의 이동·토글·나가기 콜백 셋입니다. 화면은
  // 스택도 `dispatch`도 모릅니다(위 원칙 그대로).
  sessionOptions: SessionOptions;
  onSelectNavTarget: (target: SettingsNavTarget) => void;
  onExitSettingsStack: () => void;
  onSubmitFeedback: FeedbackScreenProps["onSubmit"];
  // 진입 흐름 화면의 결선입니다. `entryLanguage`만 App 상태를 그대로 내리고, 나머지는 전이·이벤트·토큰 저장을
  // 여는 콜백입니다(가입 직후 ① 이름 · ② 나라는 `LearnerSignupWiring`).
  /** 호스트가 보낸 앱 버전 — 설정 끝 줄 · 스플래시의 강제 업데이트 판정(ADR-0086). 모르면 `null`. */
  appVersion: AppVersion | null;
  onSplashTimeout: () => void;
  onOnboardingComplete: () => void;
  onSelectSocialLoginMethod: (method: SocialLoginMethod) => Promise<SocialSignInOutcome>;
  onRequestPhoneOtp: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  onResendPhoneOtp: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  onVerifyPhoneOtp: (request: PhoneOtpVerifyRequest) => Promise<PhoneOtpVerifyOutcome>;
  onLoginBack: () => void;
  onOpenLegalDocument: (document: LegalDocument) => void;
  /** 강제 업데이트 화면의 `Update` — 호스트가 스토어 페이지를 엽니다(ADR-0086). */
  onOpenAppStore: () => Promise<AppUpdateStoreOutcome>;
  onLanguageSelectBack: () => void;
  onJourneyEntryBack: () => void;
  onVerificationCodeExit: () => void;
  entryLanguage: EntryLanguage;
  onSelectEntryLanguage: (language: EntryLanguage) => void;
  onContinueLanguageSelect: () => void;
  onEnterJourney: () => void;
} & AccountWiring &
  JourneyStats &
  StatBumpWiring &
  CatalogWiring &
  LearnerSignupWiring &
  LearnerProfileWiring;

export type ScreenWiringArgs = {
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly entryEventSink: EntryEventSink;
  readonly analyticsUser: AnalyticsUser | null;
  readonly leaveApp: AccountWiringArgs["leaveApp"];
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly notifications: readonly NotificationItem[];
  readonly setNotifications: Dispatch<SetStateAction<readonly NotificationItem[]>>;
  readonly sessionOptions: SessionOptions;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly appVersion: AppVersion | null;
  readonly gemCount: number;
  readonly phoneSignIn: PhoneSignInVisibility;
  readonly setScreenLayerOpen: Dispatch<SetStateAction<boolean>>;
  readonly roleplaySections: readonly RoleplaySection[];
  readonly entryLanguage: EntryLanguage;
  readonly setEntryLanguage: Dispatch<SetStateAction<EntryLanguage>>;
} & ProgressWiringArgs &
  LearnerProfileControls &
  Omit<CatalogWiringArgs, "dispatch">;

export function screenWiring(args: ScreenWiringArgs): ScreenWiring {
  const journey = journeyWiring(args);
  const entry = entryWiring(args);

  return {
    ...journey,
    legacyTutorialPassed: args.legacyTutorialPassed,
    safeAreaInsets: args.safeAreaInsets,
    appVersion: args.appVersion,
    gemCount: args.gemCount,
    streakDays: args.streakDays,
    trophyCount: args.trophyCount,
    statBumps: args.statBumps,
    onStatBumped: args.onStatBumped,
    journeyMapProgressLoad: args.journeyMapProgressLoad,
    phoneSignIn: args.phoneSignIn,
    onScreenLayerChange: args.setScreenLayerOpen,
    roleplaySections: args.roleplaySections,
    onViewAllRoleplayEpisode: (episodeId: RoleplayEpisodeId) => {
      args.dispatch({ type: "push", screen: { name: "roleplay-episode", episodeId } });
    },
    onExitRoleplayEpisode: () => {
      args.dispatch({ type: "back" });
    },
    ...entry,
    ...accountWiring({
      analyticsUser: args.analyticsUser,
      entryEventSink: args.entryEventSink,
      leaveApp: args.leaveApp,
    }),
    ...catalogWiring(args),
    ...learnerProfileWiring(args),
  };
}
