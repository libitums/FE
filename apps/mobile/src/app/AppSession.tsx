import { useEffect, useGlobalProps, useReducer, useState } from "@lynx-js/react";

import { FirstUnitGuideProvider } from "../components/first-unit-guide";
import { BottomNavigator } from "../components/BottomNavigator";
import type { AnalyticsUserAppProps } from "../lib/analytics.contract";
import { announce } from "../lib/accessibility";
import type { AnswerResult } from "../lib/answer-result";
import type { EntryAppProps } from "../lib/entry-flow";
import { loadUiLanguage } from "../lib/ui-language";
import type { EntryLanguage } from "../lib/entry-language";
import { safeAreaInsetsFrom, zeroSafeAreaInsets } from "../lib/safe-area";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { initialSessionOptions } from "../lib/session-options";
import { isMapItemComplete, journeyMapSections } from "../screens/journey-map/journey-map";
import { roleplaySectionsFrom } from "../screens/roleplay-list/roleplay-list";
import type { MessengerAppProps, MessengerUnitId } from "../screens/messenger/messenger.contract";
import type {
  NotificationAppProps,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import type { PhoneCallAppProps, PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { SettingsAppProps } from "../screens/settings/settings.contract";
import type {
  VisualNovelAppProps,
  VisualNovelProgress,
} from "../screens/visual-novel/visual-novel.contract";
import type { EpisodeFinalUnitId } from "../screens/episode-final/episode-final.contract";
import { productPhoneSignIn } from "../screens/login/login";
import type { PhoneSignInVisibility } from "../screens/login/login.contract";
import { AppHeader } from "./AppHeader";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, navReducer, showsTabNavigator } from "./nav-reducer";
import { notificationList } from "./app-content";
import type {
  EpisodeIntroUnitId,
  EpisodeIntroAppProps,
  EpisodePrologue,
} from "../screens/episode-intro/episode-intro.contract";
import { episodePrologueFor as productEpisodePrologueFor } from "./episode-prologues";
import type { EpisodeFinalTest } from "../screens/episode-final/episode-final.contract";
import { episodeFinalTestFor as productEpisodeFinalTestFor } from "../screens/episode-final/episode-final-tests";
import { completedVisualNovelUnitIdsFrom, productJourneySeed } from "./journey-progress";
import type { AppJourneySeed } from "./journey-progress";
import type { Screen } from "./nav-state";
import { renderScreen } from "./render-screen";
import { screenWiring } from "./screen-wiring";
import { useOpenedPush } from "./use-opened-push";
import { useSystemBack } from "./use-system-back";
import { useJourneyProgress } from "./use-journey-progress";
import { episodeSurveyWiring } from "./episode-survey-wiring";
import type { AppProps } from "./app-props";
import type { AppSessionControl } from "./leave-app.contract";

import "./app.css";

// 루트 구성의 몸통입니다(`App`이 key로 세웁니다) — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다(ADR-0003 D5).
// `phoneCallEventSink`는 메신저·비주얼 노벨과 같은 방식으로 App 경계에서 `null`로 정규화됩니다.
// 가장자리(상태바 · 홈 인디케이터 뒤)까지 배경을 까는 화면입니다. 서사 표지 · 그 뒤의
// 서사(비주얼 노벨) · 서사 통화 · 최종 테스트는 화면 전체를 한 장면으로 덮습니다(Figma 80-7869 ·
// 79-6304 · 80-7797 · 79-6484).
//
// ⟨2026-09-28⟩ **여정 입장도 같은 자리입니다.** 그 화면의 디자인 의도가 「그림을 화면
// 전체에 깐다」인데 셸이 여백을 잡아 위 · 아래에 그림이 닿지 않는 흰 띠가 남았습니다
// (기기에서 확인). 스플래시는 셸 배경색을 바꿔 같은 문제를 풀지만(`app-splash`), 배경이
// 색이 아니라 사진인 둘은 그 방법이 안 통합니다.
function isFullBleedScreen(screen: Screen): boolean {
  return (
    screen.name === "episode-intro" ||
    screen.name === "episode-prologue" ||
    screen.name === "episode-final" ||
    screen.name === "visual-novel" ||
    screen.name === "roleplay-visual-novel" ||
    screen.name === "journey-entry"
  );
}

export function AppSession({
  journeySeed = productJourneySeed,
  completedEpisodeIntroIds: initialCompletedEpisodeIntroIds = [],
  episodePrologueFor = productEpisodePrologueFor,
  episodeFinalTestFor = productEpisodeFinalTestFor,
  initialGemCount = 0,
  phoneSignIn = productPhoneSignIn,
  messengerEventSink = null,
  visualNovelEventSink = null,
  phoneCallEventSink = null,
  notificationEventSink = null,
  settingsEventSink = null,
  entryEventSink = null,
  episodeIntroEventSink = null,
  analyticsUser = null,
  start,
  exit,
  onLeaveApp,
}: AppProps & AppSessionControl) {
  // 이 리듀서를 부르는 유일한 자리입니다. `dispatch`는 셸에 콜백으로 내려갑니다
  // — 셸은 `NavAction`도 `dispatch`도 받지 않습니다(ADR-0007 D3).
  // 초기값이 `entryInitialNav`입니다 — 부팅이 진입 스택 `[{ name: "splash" }]`로
  // 시작합니다. `initialNav` 자신은 안 바뀝니다 — 그래서 이 한 줄이 부팅 화면을
  // 바꾸는 유일한 자리입니다.
  const [nav, dispatch] = useReducer(navReducer, start);

  // 고른 언어(= UI 언어)입니다. 첫 렌더에 저장값을 읽고, Provider가 이 언어의 문구표를 내립니다.
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage>(loadUiLanguage);

  // 떠난 뒤 새로 선 세션이면 결과를 한 번 낭독합니다 — 화면이 통째로 바뀌어 달리 알 길이 없습니다.
  useEffect(() => {
    if (exit !== null) announce(uiCopyFor(entryLanguage).settings.exitAnnouncement[exit]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // **진행의 진실의 출처입니다**(스텝 · 특별 유닛 · 표지 · 최종 테스트). 스텝 상태는 여기서 파생되고(`stepStatusAt`),
  // `Nav`에 적지 않습니다(ADR-0007 D3). ⟨2026-09-30⟩ **서버에 저장합니다**(ADR-0035) — 로그인 뒤 불러와 합치고
  // 바뀔 때마다 저장합니다. 연속 학습 · 트로피도 이 훅이 냅니다.
  const progress = useJourneyProgress(journeySeed, initialCompletedEpisodeIntroIds);
  const {
    completedStepCount,
    setCompletedStepCount,
    completedMessengerUnitIds,
    setCompletedMessengerUnitIds,
    completedPhoneCallUnitIds,
    setCompletedPhoneCallUnitIds,
    visualNovelProgress,
    setVisualNovelProgress,
    completedEpisodeFinalIds,
    setCompletedEpisodeFinalIds,
    completedEpisodeIntroIds,
    setCompletedEpisodeIntroIds,
  } = progress;
  // 남아 있는 알림입니다. 지운 알림은 세션 동안만 빠집니다 — **영속하지 않습니다**
  // (ADR-0007 D1). 앱을 다시 켜면 `notificationList`로 돌아갑니다.
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>(notificationList);
  const sessionOptions = initialSessionOptions;
  // 한 스텝의 활동들이 지나오며 쌓는 결과입니다. 유닛 하나가 활동 여럿을 잇고 평가는
  // 마지막에 한 번만 돌므로, 그때까지의 정오를 여기 모읍니다(journey-wiring.ts).
  const [pendingResults, setPendingResults] = useState<readonly AnswerResult[]>([]);
  // 같은 스텝에서 사용자가 건너뛴 문항 수입니다. `pendingResults`와 **같은 자리에 같은
  // 모양으로** 듭니다 — 건너뛰기가 있는 활동이 스텝의 어느 자리에 오든 수가 새지
  // 않게 하려면 둘이 함께 만들어지고 함께 버려져야 합니다.
  const [pendingSkippedCount, setPendingSkippedCount] = useState(0);
  // 가진 젬 수입니다. 결제 서비스가 아직 없어 바뀌는 길이 없고, `Pay`는 「결제 준비 중」
  // 안내만 띄웁니다. 결제가 붙으면 setter가 여기 생깁니다.
  const [gemCount] = useState(initialGemCount);
  // 탭 루트 화면 안에 겹침 레이어가 떠 있는가입니다. 화면이 알려 오고(`onScreenLayerChange`)
  // 전역 머리가 그 동안 낭독에서 빠집니다. 화면이 내려가면 화면이 스스로 `false`를
  // 알립니다.
  const [screenLayerOpen, setScreenLayerOpen] = useState(false);

  // 롤플레이 구획입니다. **진행에서 파생합니다** — 에피소드는 여정에서 그 에피소드의
  // 항목을 전부 끝냈을 때 열리고, 그 판정의 출처는 위의 진행 넷입니다. 상태로 따로 두면
  // 진행과 어긋날 자리가 생깁니다(ADR-0007 D3). 결제 전에는 Plus 예고 항목을 싣지 않습니다.
  const roleplaySections = roleplaySectionsFrom(journeyMapSections, (item) =>
    isMapItemComplete(item, {
      completedStepCount,
      completedEpisodeIntroIds,
      completedMessengerUnitIds,
      completedPhoneCallUnitIds,
      completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(visualNovelProgress),
      completedEpisodeFinalIds,
    }),
  );

  const insets = safeAreaInsetsFrom(useGlobalProps());
  const wiring = screenWiring({
    safeAreaInsets: insets,
    gemCount,
    phoneSignIn,
    setScreenLayerOpen,
    episodePrologueFor,
    episodeFinalTestFor,
    messengerEventSink,
    phoneCallEventSink,
    visualNovelEventSink,
    notificationEventSink,
    settingsEventSink,
    entryEventSink,
    episodeIntroEventSink,
    analyticsUser,
    leaveApp: onLeaveApp,
    dispatch,
    completedMessengerUnitIds,
    setCompletedMessengerUnitIds,
    completedPhoneCallUnitIds,
    setCompletedPhoneCallUnitIds,
    visualNovelProgress,
    setVisualNovelProgress,
    completedEpisodeFinalIds,
    setCompletedEpisodeFinalIds,
    completedStepCount,
    setCompletedStepCount,
    notifications,
    setNotifications,
    sessionOptions,
    pendingResults,
    setPendingResults,
    completedEpisodeIntroIds,
    setCompletedEpisodeIntroIds,
    pendingSkippedCount,
    setPendingSkippedCount,
    roleplaySections,
    entryLanguage,
    setEntryLanguage,
    streakDays: progress.streakDays,
    trophyCount: progress.trophyCount,
    syncProgress: progress.syncFromServer,
  });

  // 호스트가 LynxView를 전체 화면으로 띄우므로 셸이 가려지는 가장자리만큼
  // 안쪽 여백을 잡습니다. 여백은 셸 배경이 칠하고, 스플래시일 때만 그 배경이
  // 브랜드색입니다(lib/safe-area.ts).
  //
  // 아래쪽만 예외입니다 — 바텀 네비게이션이 서면 셸은 아래를 비우지 않습니다. 바가
  // 화면 바닥까지 배경을 칠하고 홈 인디케이터를 피하는 여백을 스스로 지기 때문입니다.
  // iOS 기본 탭바와 같은 형태입니다.
  // 누른 서버 푸시는 앱 구간에 들어선 뒤에 엽니다(ADR-0034).
  useOpenedPush(nav.entry.length === 0, wiring.onOpenPushTarget);
  // Android 시스템 뒤로가기는 화면의 닫기와 같은 경로를 탑니다(ADR-0043).
  useSystemBack(nav, dispatch);

  const screenNow = currentScreen(nav);
  const isPhoneCall = screenNow.name === "phone-call" || screenNow.name === "roleplay-phone-call";
  const showsNavigator = showsTabNavigator(nav);
  // 가장자리까지 그림을 까는 화면은 셸이 여백을 잡지 않습니다 — 셸 배경이 칠하는 띠가
  // 그림을 끊습니다. 여백은 화면이 자기 안에서 잡습니다(`wiring.safeAreaInsets`).
  const shellInsets = isFullBleedScreen(screenNow) ? zeroSafeAreaInsets : insets;

  return (
    <UiCopyContext.Provider value={uiCopyFor(entryLanguage)}>
      <FirstUnitGuideProvider
        enabled={
          progress.hasLoadedProgress &&
          completedStepCount === 0 &&
          completedEpisodeIntroIds.length === 0 &&
          completedMessengerUnitIds.length === 0 &&
          completedPhoneCallUnitIds.length === 0 &&
          completedEpisodeFinalIds.length === 0 &&
          visualNovelProgress.status === "active" &&
          visualNovelProgress.beatIndex === 0
        }
      >
        <ErrorBoundary>
          <view
            className={
              screenNow.name === "splash" ? "app app-splash" : isPhoneCall ? "app app-call" : "app"
            }
            style={{
              paddingTop: `${shellInsets.top}px`,
              // 바가 설 때 아래는 비우지 않습니다 — 바가 화면 바닥까지 배경을 칠하고,
              // 홈 인디케이터를 피하는 여백은 바 자신의 `padding-bottom`이 집니다.
              paddingBottom: `${showsNavigator ? 0 : shellInsets.bottom}px`,
              paddingLeft: `${shellInsets.left}px`,
              paddingRight: `${shellInsets.right}px`,
            }}
          >
            <view className="app-content">
              {renderScreen(screenNow, wiring)}
              {/* 탭 루트에서는 전역 머리가 콘텐츠 위에 겹칩니다. */}
              {showsNavigator ? (
                <AppHeader
                  streakDays={progress.streakDays}
                  trophyCount={progress.trophyCount}
                  celebrateStreak={progress.streakCelebration}
                  onStreakCelebrated={progress.onStreakCelebrated}
                  episodeSurvey={progress.episodeSurvey}
                  {...episodeSurveyWiring({
                    episodeIntroEventSink,
                    onClosed: progress.onEpisodeSurveyClosed,
                  })}
                  obscured={screenLayerOpen}
                  onOpenNotifications={wiring.onOpenNotifications}
                />
              ) : null}
            </view>
            {/* 로그인 뒤 탭 루트에만 바를 겹칩니다. 하단 여백은 각 화면이 집니다. */}
            {showsNavigator ? (
              <view className="app-navigator" accessibility-elements-hidden={screenLayerOpen}>
                <BottomNavigator
                  tab={nav.tab}
                  onSelectTab={(tab) => {
                    // 탭이 실제로 설정으로 바뀔 때만 `settings_opened`가 섭니다 —
                    // 이미 그 탭인 무동작 재탭을 열람으로 세지 않습니다.
                    if (tab === "settings" && nav.tab !== "settings")
                      settingsEventSink?.({ name: "settings_opened" });
                    dispatch({ type: "switchTab", tab });
                  }}
                />
              </view>
            ) : null}
          </view>
        </ErrorBoundary>
      </FirstUnitGuideProvider>
    </UiCopyContext.Provider>
  );
}
