import { useEffect, useGlobalProps, useMemo, useReducer, useState } from "@lynx-js/react";

import { FirstUnitGuideProvider } from "../components/first-unit-guide";
import { announce } from "../lib/accessibility";
import type { AnswerResult } from "../lib/answer-result";
import { loadUiLanguage } from "../lib/ui-language";
import type { EntryLanguage } from "../lib/entry-language";
import { appVersionFrom } from "../lib/app-version";
import { safeAreaInsetsFrom, tappableBottomInsetFrom } from "../lib/safe-area";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { initialListenPace } from "../lib/listen-pace";
import type { ListenPace } from "../lib/listen-pace";
import { initialSessionOptions } from "../lib/session-options";
import type { NotificationItem } from "../screens/notifications/notifications.contract";
import { productPhoneSignIn } from "../screens/login/login";
import { AppHeader } from "./AppHeader";
import { AppNavigator } from "./AppNavigator";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, navReducer, showsTabNavigator, tabRootActions } from "./nav-reducer";
import { shellBottomLayout } from "./shell-bottom-layout";
import { notificationList } from "./app-content";
import { roleplaySectionsOf } from "./roleplay-sections";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { AppSessionContent } from "./episode-content";
import { shellHeaderTop } from "./full-bleed-screens";
import { shellInsetsOf } from "./shell-edges";
import { renderScreen } from "./render-screen";
import { screenWiring } from "./screen-wiring";
import { useTrackingAuthorizationPrompt } from "./use-tracking-authorization-prompt";
import { useOpenedDeeplink } from "./use-opened-deeplink";
import { useOpenedPush } from "./use-opened-push";
import { usePushTokenRefresh } from "./use-push-token-refresh";
import { useSystemBack } from "./use-system-back";
import { useJourneyProgress } from "./use-journey-progress";
import { useProgressLoadEvents } from "./use-progress-load-events";
import { useLearnerProfile } from "./use-learner-profile";
import { useCatalogFinishGuard } from "./catalog-finish-guard";
import { episodeSurveyWiring } from "./episode-survey-wiring";
import { firstUnitGuideEnabled } from "./first-unit-guide-enabled";
import { OutOfTicketsDialog } from "../screens/tickets/OutOfTicketsDialog";
import { CatalogUpdateNoticeDialog } from "../screens/catalog-update/CatalogUpdateNoticeDialog";
import { useCatalogUpdateNotice } from "./use-catalog-update-notice";
import { withLearningTickets } from "./ticket-wiring";
import { useLearningTickets } from "./use-learning-tickets";
import { useTesterAccess } from "./use-tester-access";
import type { AppProgressSeed, AppProps } from "./app-props";
import type { AppSessionControl } from "./leave-app.contract";

import "./app.css";

const noProgressSeed: AppProgressSeed = {};

// 루트 구성의 몸통입니다(`App`이 key로 세웁니다) — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다(ADR-0003 D5).
export function AppSession({
  progressSeed = noProgressSeed,
  initialGemCount = 0,
  phoneSignIn = productPhoneSignIn,
  notificationEventSink = null,
  settingsEventSink = null,
  entryEventSink = null,
  episodeIntroEventSink = null,
  analyticsUser = null,
  start,
  exit,
  onLeaveApp,
  episodeContent,
}: AppProps & AppSessionControl & AppSessionContent) {
  // 이 리듀서를 부르는 유일한 자리입니다. `dispatch`는 셸에 콜백으로 내려갑니다 — 셸은 `NavAction`도 `dispatch`도
  // 받지 않습니다(ADR-0007 D3). 초기값이 `entryInitialNav`입니다 — 부팅이 진입 스택 `[{ name: "splash" }]`로
  // 시작합니다. `initialNav` 자신은 안 바뀝니다 — 그래서 이 한 줄이 부팅 화면을 바꾸는 유일한 자리입니다.
  const [nav, dispatch] = useReducer(navReducer, start);

  // 고른 언어(= UI 언어)입니다. 첫 렌더에 저장값을 읽고, Provider가 이 언어의 문구표를 내립니다.
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage>(loadUiLanguage);

  // 떠난 뒤 새로 선 세션이면 결과를 한 번 낭독합니다 — 화면이 통째로 바뀌어 달리 알 길이 없습니다.
  useEffect(() => {
    if (exit !== null) announce(uiCopyFor(entryLanguage).settings.exitAnnouncement[exit]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카탈로그 구획은 카탈로그가 바뀔 때만 새로 만듭니다 — 진행은 섞지 않고 렌더에서 파생합니다.
  const catalogSections = useMemo(
    () => catalogMapSectionsOf(episodeContent.catalog),
    [episodeContent.catalog],
  );
  // **진행의 진실의 출처입니다** — `Nav`에 적지 않고(ADR-0007 D3) 서버에 저장합니다(ADR-0035). 트로피의 완료 규칙은 구획에서 받습니다.
  // 시험 계정 표시를 먼저 맞춥니다 — 아래 진행 · 티켓 · 맵 판정이 같은 렌더에서 읽습니다(ADR-0085).
  const testerAccess = useTesterAccess(analyticsUser);
  const progress = useJourneyProgress(progressSeed, catalogSections);
  useProgressLoadEvents(progress.progressLoadPhase, episodeIntroEventSink);
  const learner = useLearnerProfile();
  // 머리 칩이 서 있으면 쓴 티켓이 줄어드는 것을 보인 뒤 레슨을 엽니다(시안 E4).
  const tickets = useLearningTickets(progress.tickets, progress.setTickets, episodeIntroEventSink, {
    chipShown: showsTabNavigator(nav),
  });
  const { catalogProgress, setCatalogProgress } = progress;
  // 남아 있는 알림입니다. 지운 알림은 세션 동안만 빠집니다 — **영속하지 않습니다**
  // (ADR-0007 D1). 앱을 다시 켜면 `notificationList`로 돌아갑니다.
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>(notificationList);
  const sessionOptions = initialSessionOptions;
  // 한 유닛의 활동들이 지나오며 쌓는 결과입니다. 유닛 하나가 활동 여럿을 잇고 평가는 마지막에 한 번만 돌므로,
  // 그때까지의 정오를 여기 모읍니다(catalog-lesson-wiring.ts). 건너뛴 문항 수도 같은 자리 · 같은 모양입니다 —
  // 둘이 함께 만들어지고 함께 버려져야 수가 새지 않습니다.
  const [pendingResults, setPendingResults] = useState<readonly AnswerResult[]>([]);
  const [pendingSkippedCount, setPendingSkippedCount] = useState(0);
  // 「천천히」는 레슨 하나 동안만 이어집니다 — 시작 · 나가기 · 끝에서 되돌립니다(저장하지 않음).
  const [listenPace, setListenPace] = useState<ListenPace>(initialListenPace);
  const finishGuard = useCatalogFinishGuard();
  // 가진 젬 수입니다. 결제 서비스가 아직 없어 바뀌는 길이 없고, `Pay`는 「결제 준비 중」
  // 안내만 띄웁니다. 결제가 붙으면 setter가 여기 생깁니다.
  const [gemCount] = useState(initialGemCount);
  // 탭 루트 화면 안에 겹침 레이어가 떠 있는가입니다. 화면이 알려 오고(`onScreenLayerChange`) 전역 머리가 그 동안
  // 낭독에서 빠집니다. 화면이 내려가면 화면이 스스로 `false`를 알립니다.
  const [screenLayerOpen, setScreenLayerOpen] = useState(false);

  // 롤플레이 구획 — 본편 에피소드마다 하나, 진행에서 파생합니다(roleplay-sections.ts).
  const catalog = { episodeContent, catalogSections, catalogProgress };
  const roleplaySections = roleplaySectionsOf({
    catalog,
    learnerFill: learner.learnerFill,
    episodeLabel: uiCopyFor(entryLanguage).catalogMap.episodeLabel,
  });

  const globalProps = useGlobalProps();
  const insets = safeAreaInsetsFrom(globalProps);
  const tappableBottom = tappableBottomInsetFrom(globalProps);
  // 호스트가 보낸 앱 버전입니다 — 설정 끝 줄과 스플래시의 강제 업데이트 판정이 씁니다(ADR-0086).
  const appVersion = appVersionFrom(globalProps);
  const screens = screenWiring({
    safeAreaInsets: insets,
    appVersion,
    gemCount,
    phoneSignIn,
    setScreenLayerOpen,
    notificationEventSink,
    settingsEventSink,
    entryEventSink,
    episodeIntroEventSink,
    analyticsUser,
    leaveApp: onLeaveApp,
    dispatch,
    legacyTutorialPassed: progress.legacyTutorialPassed,
    notifications,
    setNotifications,
    sessionOptions,
    pendingResults,
    setPendingResults,
    pendingSkippedCount,
    setPendingSkippedCount,
    roleplaySections,
    entryLanguage,
    setEntryLanguage,
    ...progress.wiring,
    ...catalog,
    setCatalogProgress,
    ...learner,
    finishGuard,
    listenPace,
    setListenPace,
  });
  const wiring = withLearningTickets(screens, tickets, progress, catalogSections);

  // 셸이 가장자리 여백을 잡고 배경을 칠합니다(자판 화면은 위만 — shell-edges.ts). 스플래시만 브랜드색.
  // 아래쪽만 예외입니다 — 바가 서면 셸은 터치를 가로채는 시스템 바만큼(`tappableBottomInset`,
  // Android 3버튼)만 비우고 탭 바 묶음이 그 밑을 덧댑니다. iOS · 제스처는 0입니다.
  // 누른 서버 푸시는 앱 구간에 들어선 뒤에 엽니다(ADR-0034).
  useOpenedPush(nav.entry.length === 0, wiring.onOpenPushTarget);
  // Airbridge 딥링크 · 지연 딥링크도 앱 구간에 들어선 뒤에 그 탭을 엽니다(ADR-0080).
  useOpenedDeeplink(nav.entry.length === 0, (tab) => {
    for (const action of tabRootActions(tab)) dispatch(action);
  });
  usePushTokenRefresh();
  // Android 시스템 뒤로가기는 화면의 닫기와 같은 경로를 탑니다(ADR-0043).
  useSystemBack(nav, dispatch);

  const screenNow = currentScreen(nav);
  useTrackingAuthorizationPrompt(nav.entry.length === 0 && screenNow.name === "journey-map");
  const showsNavigator = showsTabNavigator(nav);
  // 끝낸 에피소드가 업데이트됐으면 지도 루트에서 다른 겹침이 없을 때 한 번 알립니다(시안 G-A).
  const updateNotice = useCatalogUpdateNotice({
    catalog: episodeContent.catalog,
    sections: catalogSections,
    progress: catalogProgress,
    ready:
      progress.hasLoadedProgress &&
      nav.entry.length === 0 &&
      screenNow.name === "journey-map" &&
      !screenLayerOpen &&
      tickets.outOfTickets === null &&
      progress.episodeSurvey === null &&
      !progress.streakCelebration,
  });
  // 셸 여백: 그림 화면 0 · 여정 맵 위 0 · 자판 화면 위만 — 비운 쪽은 화면이 잡습니다(`shell-edges`).
  const shellInsets = shellInsetsOf(screenNow, insets, wiring);
  const bottomLayout = shellBottomLayout({
    showsNavigator,
    safeBottom: shellInsets.bottom,
    tappableBottom,
  });

  return (
    <UiCopyContext.Provider value={uiCopyFor(entryLanguage)}>
      <FirstUnitGuideProvider
        enabled={firstUnitGuideEnabled({
          hasLoadedProgress: progress.hasLoadedProgress,
          legacyTutorial: progress.legacyTutorial,
          catalogProgress,
        })}
      >
        <ErrorBoundary>
          <view
            className={screenNow.name === "splash" ? "app app-splash" : "app"}
            data-testid="app-shell"
            style={{
              paddingTop: `${shellInsets.top}px`,
              paddingBottom: `${bottomLayout.shellPaddingBottom}px`,
              paddingLeft: `${shellInsets.left}px`,
              paddingRight: `${shellInsets.right}px`,
            }}
          >
            <view className="app-content">
              {renderScreen(screenNow, wiring)}
              {/* 탭 루트에서는 전역 머리가 콘텐츠 위에 겹칩니다. */}
              {showsNavigator ? (
                <AppHeader
                  top={shellHeaderTop(screenNow, insets)}
                  streakDays={progress.streakDays}
                  trophyCount={progress.headerTrophyCount}
                  celebrateStreak={progress.streakCelebration}
                  onStreakCelebrated={progress.onStreakCelebrated}
                  statBump={progress.wiring}
                  tickets={tickets.header}
                  ticketsUnlimited={testerAccess}
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
              <AppNavigator
                tab={nav.tab}
                obscured={screenLayerOpen}
                floorHeight={bottomLayout.navigatorFloorHeight}
                onSelectTab={(tab) => {
                  // 탭이 실제로 설정으로 바뀔 때만 `settings_opened`가 섭니다 —
                  // 이미 그 탭인 무동작 재탭을 열람으로 세지 않습니다.
                  if (tab === "settings" && nav.tab !== "settings")
                    settingsEventSink?.({ name: "settings_opened" });
                  dispatch({ type: "switchTab", tab });
                }}
              />
            ) : null}
            {/* 티켓 없이 새 레슨을 열려 하면 어느 화면 위에서든 가운데 대화상자가 뜹니다(시안 E6m). */}
            {tickets.outOfTickets === null ? null : (
              <OutOfTicketsDialog {...tickets.outOfTickets} />
            )}
            {updateNotice.open ? (
              <CatalogUpdateNoticeDialog onClose={updateNotice.onClose} />
            ) : null}
          </view>
        </ErrorBoundary>
      </FirstUnitGuideProvider>
    </UiCopyContext.Provider>
  );
}
