import { guardedEpisodeFinalWiring } from "./journey-access";
// `ScreenWiring`·`RoleplayUnitWiring` 타입을 선언하고, 부분 팩토리(`journeyWiring`·`roleplayWiring`·
// `entryWiring` 등)를 합쳐 하나의 wiring을 만듭니다.

import type { AccountWiringArgs } from "./leave-app.contract";
import type { Dispatch, SetStateAction } from "@lynx-js/react";
import type {
  EpisodeIntroEventSink,
  EpisodeIntroExitStage,
  EpisodeIntroUnitId,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";
import type { SafeAreaInsets } from "../lib/safe-area";
import { accountWiring } from "./account-wiring";
import type { AccountWiring } from "./leave-app.contract";

import type { AnswerResult } from "../lib/answer-result";
import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
  PhoneOtpVerifyRequest,
} from "../lib/auth-session.contract";
import type { FeedbackScreenProps } from "../screens/feedback/feedback.contract";
import type { JourneyStats, ProgressWiringArgs } from "./learning-progress";
import type { AnalyticsUser } from "../lib/analytics-user.contract";
import type { LegalDocument } from "../lib/legal-document.contract";
import type { EntryEventSink } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import type { SocialSignInOutcome } from "../lib/social-sign-in.contract";
import type { PhoneSignInVisibility, SocialLoginMethod } from "../screens/login/login.contract";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type {
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import type {
  NotificationEventSink,
  NotificationItem,
  PushNotificationTarget,
} from "../screens/notifications/notifications.contract";
import type {
  PhoneCallEventSink,
  PhoneCallExitOutcome,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import type {
  RoleplayEpisodeId,
  RoleplayItem,
  RoleplaySection,
} from "../screens/roleplay-list/roleplay-list.contract";
import type { SettingsEventSink, SettingsNavTarget } from "../screens/settings/settings.contract";
import type { SessionOptionKey, SessionOptions } from "../lib/session-options";
import type {
  VisualNovelAdvanceOutcome,
  VisualNovelBeatId,
  VisualNovelEventSink,
  VisualNovelExitOutcome,
  VisualNovelProgress,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";
import type { NavAction } from "./nav-state";
import { entryWiring } from "./entry-wiring";
import type { EpisodeFinalWiring, EpisodeFinalWiringArgs } from "./episode-final-wiring";
import { journeyWiring } from "./journey-wiring";
import { roleplayWiring } from "./roleplay-wiring";

// 롤플레이 route 셋의 App 쪽 콜백 여덟입니다. 연습 모드 경계의 판정 자리입니다
// — 이 타입의 구현부(`roleplay-wiring.ts`)는 여정 상태 넷
// (`completedStepCount` · `completedMessengerUnitIds` ·
// `completedPhoneCallUnitIds` · `visualNovelProgress`)과 그 setter를 읽지도
// 부르지도 않습니다.
export type RoleplayUnitWiring = {
  readonly onMessengerExit: (id: MessengerUnitId, outcome: MessengerExitOutcome) => void;
  readonly onMessengerComplete: (id: MessengerUnitId) => void;
  readonly onMessengerFinish: (id: MessengerUnitId, results: readonly AnswerResult[]) => void;
  readonly onPhoneCallComplete: (id: PhoneCallUnitId) => void;
  readonly onPhoneCallExit: (outcome: PhoneCallExitOutcome) => void;
  readonly onVisualNovelAdvance: (
    id: VisualNovelUnitId,
    outcome: VisualNovelAdvanceOutcome,
  ) => void;
  readonly onVisualNovelExit: (id: VisualNovelUnitId, beatId: VisualNovelBeatId) => void;
  readonly onVisualNovelReplay: (id: VisualNovelUnitId) => void;
};

// 화면 결선이 `renderScreen`에 넘기는 것입니다. 셸이 소유한 값 하나와 콜백
// 셋입니다.
//
// **`dispatch`도 `NavAction`도 여기 들어가지 않습니다** — 화면은 스택을
// 모릅니다(ADR-0007 D3). 화면이 받는 것은 "무엇이 일어났다"는 콜백뿐이고,
// 그것을 무슨 네비게이션 동작으로 옮길지는 `App`이 정합니다.
export type ScreenWiring = {
  messengerEventSink: MessengerEventSink;
  completedMessengerUnitIds: readonly MessengerUnitId[];
  onStartMessengerUnit: (id: MessengerUnitId) => void;
  onMessengerExit: (id: MessengerUnitId, outcome: MessengerExitOutcome) => void;
  onMessengerComplete: (id: MessengerUnitId) => void;
  onMessengerFinish: (id: MessengerUnitId, results: readonly AnswerResult[]) => void;
  // 메신저 뒤 학습 완료의 나가기입니다 — 연 스택의 루트로 갑니다.
  onExitMessengerComplete: () => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  onPhoneCallComplete: (id: PhoneCallUnitId) => void;
  onPhoneCallExit: (outcome: PhoneCallExitOutcome) => void;
  onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
  visualNovelProgress: VisualNovelProgress;
  onVisualNovelAdvance: (id: VisualNovelUnitId, outcome: VisualNovelAdvanceOutcome) => void;
  onVisualNovelExit: (outcome: VisualNovelExitOutcome, beatId: VisualNovelBeatId) => void;
  onVisualNovelReplay: (id: VisualNovelUnitId) => void;
  completedStepCount: number;
  /** 끝낸 표지 유닛입니다 — 맵의 표지 게이트가 이 값을 봅니다. */
  completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  // 표지 항목에서 시작합니다. 일반·특별 유닛의 진입은 맵과 같은 순차 해금을 적용합니다.
  onStartEpisodeIntroUnit: (id: EpisodeIntroUnitId) => void;
  onStartStep: (id: JourneyStepId) => void;
  // 학습 화면 셋이 같은 콜백을 받으므로 이름이 듣기에 묶여 있으면 거짓이
  // 됩니다.
  onExitLearning: () => void;
  // 듣기가 넘기는 것은 「끝났다」와 「무엇이 일어났는지」뿐입니다. 통과 여부는
  // 여기서 계산하지 않습니다 — 판정의 권한은 평가로 옮겨갔습니다.
  /**
   * 학습 활동 하나가 끝났을 때 부릅니다. `activityIndex`는 그 활동이 스텝의 몇 번째인지로,
   * 다음 활동이 남았는지 가릴 때 씁니다 — 남았으면 다음 활동으로 갈아타고, 없으면 그때
   * 평가가 한 번 돕니다.
   */
  onFinishLearning: (
    id: JourneyStepId,
    activityIndex: number,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
  // 평가의 `맵으로`입니다. 중도 이탈(`onExitLearning`)과 같은 형태로 진행을
  // 갱신하지 않고 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
  onExitAssessment: () => void;
  // 문화의 `맵으로`입니다. **진행을 갱신하지 않습니다** — 완료를 걸 판정이 이 경로에 없습니다(스텝 완료는 평가의
  // 판정 하나가 겁니다, `docs/screens.md` 「문화 학습과 문화 퀴즈」). 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
  onExitCulture: () => void;
  // 문화 학습의 액션 행 `퀴즈 풀기`입니다. 문화 퀴즈를 push합니다 — replace가
  // 아닙니다. 나아가는 수단은 자기 화면을 스택에서 지우지 않습니다.
  onStartCultureQuiz: (id: JourneyStepId) => void;
  // 롤플레이 목록 항목 선택입니다. 해당 sink에 열림 이벤트(출처 `roleplay`) →
  // `push(roleplayScreenFor(item))`.
  onStartRoleplayUnit: (item: RoleplayItem) => void;
  // 롤플레이 화면의 구획입니다 — 어느 에피소드가 열렸는지까지 진행에서 파생한 값입니다.
  // `전체 보기`는 그 에피소드의 화면을 push하고, 그 화면의 나가기는 `back`입니다.
  roleplaySections: readonly RoleplaySection[];
  onViewAllRoleplayEpisode: (episodeId: RoleplayEpisodeId) => void;
  onExitRoleplayEpisode: () => void;
  // 롤플레이 route 셋의 콜백 묶음입니다. 연습 경계는 이 타입의 매개변수 모양과
  // 구현부 둘 다가 집니다.
  roleplay: RoleplayUnitWiring;
  // 여정 맵 머리 알림 버튼 · 알림 항목 선택 · 알림 화면 나가기입니다(`dispatch` 없음 — 위 원칙 그대로).
  onOpenNotifications: () => void;
  // `notifications`는 남아 있는 알림이고, 삭제는 그 목록에서 하나를 뺍니다.
  notifications: readonly NotificationItem[];
  onSelectNotification: (item: NotificationItem) => void;
  onDeleteNotification: (item: NotificationItem) => void;
  onExitNotifications: () => void;
  // 누른 서버 푸시의 목적지로 갑니다(ADR-0034). 화면이 아니라 `useOpenedPush`가 부릅니다.
  onOpenPushTarget: (target: PushNotificationTarget) => void;
  // 에피소드 표지의 넘기기 · 나가기입니다. 넷 다 **표지 유닛 id 하나**를 받습니다 —
  // 「넘긴 뒤 열 유닛」이 없어졌기 때문입니다(spec §2.5). `Skip`은 맵이 아니라 만점
  // 결과 화면으로 갑니다(D5).
  onSkipEpisodeIntro: (id: EpisodeIntroUnitId) => void;
  onNextEpisodeIntro: (id: EpisodeIntroUnitId) => void;
  // 나간 자리(표지 · 서사)를 함께 받습니다 — 이벤트가 어디서 나갔는지 싣습니다.
  onExitEpisodeIntro: (id: EpisodeIntroUnitId, stage: EpisodeIntroExitStage) => void;
  // 표지 `Next` 뒤 에피소드 서사의 끝 · 결과 화면의 나가기입니다. 완료를 적는 자리는
  // 뒤쪽 하나뿐입니다.
  onCompletePrologue: (id: EpisodeIntroUnitId) => void;
  onExitPrologueComplete: (id: EpisodeIntroUnitId) => void;
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
  // 에피소드의 서사 전개를 찾습니다 — 서사 route가 어느 형식의 화면을 그릴지 여기서 읽습니다.
  episodePrologueFor: (episodeId: string) => EpisodePrologue | undefined;
  // 세션 옵션의 진실의 출처와 설정 탭의 이동·토글·나가기 콜백 셋입니다. 화면은
  // 스택도 `dispatch`도 모릅니다(위 원칙 그대로).
  sessionOptions: SessionOptions;
  onSelectNavTarget: (target: SettingsNavTarget) => void;
  onToggleSessionOption: (key: SessionOptionKey) => void;
  onExitSettingsStack: () => void;
  onSubmitFeedback: FeedbackScreenProps["onSubmit"];
  // 진입 흐름 화면 여섯의 결선입니다. `entryLanguage`만 App 상태를 그대로
  // 내리고, 나머지는 전이·이벤트·토큰 저장을 여는 콜백입니다.
  onSplashTimeout: () => void;
  onOnboardingComplete: () => void;
  onSelectSocialLoginMethod: (method: SocialLoginMethod) => Promise<SocialSignInOutcome>;
  onRequestPhoneOtp: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  onResendPhoneOtp: (phone: PhoneNumber) => Promise<PhoneOtpRequestResult>;
  onVerifyPhoneOtp: (request: PhoneOtpVerifyRequest) => Promise<PhoneOtpVerifyOutcome>;
  onLoginBack: () => void;
  onOpenLegalDocument: (document: LegalDocument) => void;
  onLanguageSelectBack: () => void;
  onJourneyEntryBack: () => void;
  onVerificationCodeExit: () => void;
  entryLanguage: EntryLanguage;
  onSelectEntryLanguage: (language: EntryLanguage) => void;
  onContinueLanguageSelect: () => void;
  onEnterJourney: () => void;
} & EpisodeFinalWiring &
  AccountWiring &
  JourneyStats;

export type ScreenWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly entryEventSink: EntryEventSink;
  readonly analyticsUser: AnalyticsUser | null;
  readonly leaveApp: AccountWiringArgs["leaveApp"];
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly setCompletedMessengerUnitIds: Dispatch<SetStateAction<readonly MessengerUnitId[]>>;
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly setCompletedPhoneCallUnitIds: Dispatch<SetStateAction<readonly PhoneCallUnitId[]>>;
  readonly visualNovelProgress: VisualNovelProgress;
  readonly setVisualNovelProgress: Dispatch<SetStateAction<VisualNovelProgress>>;
  readonly completedStepCount: number;
  readonly setCompletedStepCount: Dispatch<SetStateAction<number>>;
  readonly notifications: readonly NotificationItem[];
  readonly setNotifications: Dispatch<SetStateAction<readonly NotificationItem[]>>;
  readonly sessionOptions: SessionOptions;
  readonly setSessionOptions: Dispatch<SetStateAction<SessionOptions>>;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly gemCount: number;
  readonly phoneSignIn: PhoneSignInVisibility;
  readonly setScreenLayerOpen: Dispatch<SetStateAction<boolean>>;
  readonly episodePrologueFor: (episodeId: string) => EpisodePrologue | undefined;
  readonly pendingResults: readonly AnswerResult[];
  readonly setPendingResults: Dispatch<SetStateAction<readonly AnswerResult[]>>;
  readonly completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  readonly setCompletedEpisodeIntroIds: Dispatch<SetStateAction<readonly EpisodeIntroUnitId[]>>;
  readonly pendingSkippedCount: number;
  readonly setPendingSkippedCount: Dispatch<SetStateAction<number>>;
  readonly roleplaySections: readonly RoleplaySection[];
  readonly entryLanguage: EntryLanguage;
  readonly setEntryLanguage: Dispatch<SetStateAction<EntryLanguage>>;
} & Omit<EpisodeFinalWiringArgs, "dispatch"> &
  ProgressWiringArgs;

export function screenWiring(args: ScreenWiringArgs): ScreenWiring {
  const journey = journeyWiring(args);
  const roleplay = roleplayWiring({
    messengerEventSink: args.messengerEventSink,
    visualNovelEventSink: args.visualNovelEventSink,
    dispatch: args.dispatch,
  });
  const entry = entryWiring({
    entryEventSink: args.entryEventSink,
    analyticsUser: args.analyticsUser,
    dispatch: args.dispatch,
    entryLanguage: args.entryLanguage,
    setEntryLanguage: args.setEntryLanguage,
    syncProgress: args.syncProgress,
  });

  return {
    ...journey,
    roleplay,
    safeAreaInsets: args.safeAreaInsets,
    gemCount: args.gemCount,
    streakDays: args.streakDays,
    trophyCount: args.trophyCount,
    phoneSignIn: args.phoneSignIn,
    onScreenLayerChange: args.setScreenLayerOpen,
    episodePrologueFor: args.episodePrologueFor,
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
    ...guardedEpisodeFinalWiring(args),
  };
}
