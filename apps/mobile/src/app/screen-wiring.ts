// `ScreenWiring`·`RoleplayUnitWiring` 타입을 선언하고, 세 부분 팩토리
// (`journeyWiring`·`roleplayWiring`·`entryWiring`)를 합쳐 하나의 wiring을
// 만듭니다.

import type { Dispatch, SetStateAction } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { EntryEventSink, EntryLoginMethod } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type {
  MessengerEventSink,
  MessengerExitOutcome,
  MessengerUnitId,
} from "../screens/messenger/messenger.contract";
import type {
  NotificationEventSink,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import type {
  PhoneCallEventSink,
  PhoneCallExitOutcome,
  PhoneCallUnitId,
} from "../screens/phone-call/phone-call.contract";
import type { RoleplayItem } from "../screens/roleplay-list/roleplay-list.contract";
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
  readonly onMessengerReplay: (id: MessengerUnitId) => void;
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
  onMessengerReplay: (id: MessengerUnitId) => void;
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
  onStartStep: (id: JourneyStepId) => void;
  // 학습 화면 셋이 같은 콜백을 받으므로 이름이 듣기에 묶여 있으면 거짓이
  // 됩니다.
  onExitLearning: () => void;
  // 듣기가 넘기는 것은 「끝났다」와 「무엇이 일어났는지」뿐입니다. 통과 여부는
  // 여기서 계산하지 않습니다 — 판정의 권한은 평가로 옮겨갔습니다.
  onFinishLearning: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  // 평가의 `맵으로`입니다. 중도 이탈(`onExitLearning`)과 같은 형태로 진행을
  // 갱신하지 않고 활성 스택의 루트로 곧장 닿습니다(ADR-0007 D6).
  onExitAssessment: () => void;
  // 문화의 `맵으로`입니다. **진행을 갱신하지 않습니다** — 근거는 「이 화면에
  // 나아가는 수단이 없어서」가 아닙니다. 나아가는 수단은 있습니다(`퀴즈 풀기`).
  // 근거는 **완료를 걸 판정이 이 경로에 없다**는 것입니다: 스텝 완료를 거는
  // 권한은 평가의 판정 하나이고, 문화가 진행에 거는 방식 자체가 아직
  // 미정입니다(`docs/screens.md` 「문화 학습과 문화 퀴즈」 미정 표). 활성
  // 스택의 루트로 곧장 닿는 것은 `onExitLearning`·`onExitAssessment`와 같은
  // 형태입니다(ADR-0007 D6).
  onExitCulture: () => void;
  // 문화 학습의 액션 행 `퀴즈 풀기`입니다. 문화 퀴즈를 push합니다 — replace가
  // 아닙니다. 나아가는 수단은 자기 화면을 스택에서 지우지 않습니다.
  onStartCultureQuiz: (id: JourneyStepId) => void;
  // 롤플레이 목록 항목 선택입니다. 해당 sink에 열림 이벤트(출처 `roleplay`) →
  // `push(roleplayScreenFor(item))`.
  onStartRoleplayUnit: (item: RoleplayItem) => void;
  // 롤플레이 route 셋의 콜백 묶음입니다. 연습 경계는 이 타입의 매개변수 모양과
  // 구현부 둘 다가 집니다.
  roleplay: RoleplayUnitWiring;
  // 여정 맵 머리 알림 버튼 · 알림 항목 선택 · 알림 화면 나가기입니다.
  // `dispatch`도 `NavAction`도 여기 들어가지 않습니다(위 원칙 그대로).
  onOpenNotifications: () => void;
  onSelectNotification: (item: NotificationItem) => void;
  onExitNotifications: () => void;
  // 세션 옵션의 진실의 출처와 설정 탭의 이동·토글·나가기 콜백 셋입니다. 화면은
  // 스택도 `dispatch`도 모릅니다(위 원칙 그대로).
  sessionOptions: SessionOptions;
  onSelectNavTarget: (target: SettingsNavTarget) => void;
  onToggleSessionOption: (key: SessionOptionKey) => void;
  onExitSettingsStack: () => void;
  // 진입 흐름 화면 여섯의 결선입니다. `entryLanguage`만 App 상태를 그대로
  // 내리고, 나머지는 전이·이벤트·토큰 저장을 여는 콜백입니다.
  onSplashTimeout: () => void;
  onOnboardingComplete: () => void;
  onSelectLoginMethod: (method: EntryLoginMethod, phoneNumber?: string) => void;
  onLoginBack: () => void;
  onLanguageSelectBack: () => void;
  onJourneyEntryBack: () => void;
  onVerificationCodeSubmit: () => void;
  onVerificationCodeExit: () => void;
  entryLanguage: EntryLanguage;
  onSelectEntryLanguage: (language: EntryLanguage) => void;
  onContinueLanguageSelect: () => void;
  onEnterJourney: () => void;
};

export type ScreenWiringArgs = {
  readonly messengerEventSink: MessengerEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly entryEventSink: EntryEventSink;
  readonly dispatch: Dispatch<NavAction>;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly setCompletedMessengerUnitIds: Dispatch<SetStateAction<readonly MessengerUnitId[]>>;
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly setCompletedPhoneCallUnitIds: Dispatch<SetStateAction<readonly PhoneCallUnitId[]>>;
  readonly visualNovelProgress: VisualNovelProgress;
  readonly setVisualNovelProgress: Dispatch<SetStateAction<VisualNovelProgress>>;
  readonly completedStepCount: number;
  readonly setCompletedStepCount: Dispatch<SetStateAction<number>>;
  readonly sessionOptions: SessionOptions;
  readonly setSessionOptions: Dispatch<SetStateAction<SessionOptions>>;
  readonly entryLanguage: EntryLanguage;
  readonly setEntryLanguage: Dispatch<SetStateAction<EntryLanguage>>;
};

export function screenWiring(args: ScreenWiringArgs): ScreenWiring {
  const journey = journeyWiring(args);
  const roleplay = roleplayWiring({
    messengerEventSink: args.messengerEventSink,
    visualNovelEventSink: args.visualNovelEventSink,
    dispatch: args.dispatch,
  });
  const entry = entryWiring({
    entryEventSink: args.entryEventSink,
    dispatch: args.dispatch,
    entryLanguage: args.entryLanguage,
    setEntryLanguage: args.setEntryLanguage,
  });

  return { ...journey, roleplay, ...entry };
}
