import { useEffect, useGlobalProps, useReducer, useState } from "@lynx-js/react";

import { FirstUnitGuideProvider } from "../components/first-unit-guide";
import { announce } from "../lib/accessibility";
import type { AnswerResult } from "../lib/answer-result";
import { loadUiLanguage } from "../lib/ui-language";
import { appShellClassName } from "./app-shell-class";
import type { EntryLanguage } from "../lib/entry-language";
import { appVersionFrom } from "../lib/app-version";
import { safeAreaInsetsFrom, tappableBottomInsetFrom } from "../lib/safe-area";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { initialListenPace, type ListenPace } from "../lib/listen-pace";
import { useSessionOptions } from "./use-session-options";
import type { NotificationItem } from "../screens/notifications/notifications.contract";
import { productPhoneSignIn } from "../screens/login/login";
import { AppHeader } from "./AppHeader";
import { guestUnlimitedPass } from "../lib/unlimited-pass";
import { AppNavigator } from "./AppNavigator";
import { useMessengerTabBadge } from "./use-messenger-tab-badge";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, navReducer, showsTabNavigator, tabRootActions } from "./nav-reducer";
import { shellBottomLayout } from "./shell-bottom-layout";
import { notificationList } from "./app-content";
import { roleplaySectionsOf } from "./roleplay-sections";
import { useAccountState } from "./use-account-state";
import { useSessionCatalog } from "./use-session-catalog";
import type { AppSessionContent } from "./episode-content";
import { shellHeaderTop } from "./full-bleed-screens";
import { appHeaderVisibleOn, shellInsetsOf } from "./shell-edges";
import { renderAppContent } from "./render-app-content";
import { screenWiring } from "./screen-wiring";
import { useMessengerWalletSync } from "./use-messenger-wallet-sync";
import { useSurfaceSessions } from "./use-surface-sessions";
import { useNewFriendBackfill } from "./use-new-friend-backfill";
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
import { OutOfTicketsLayer } from "./out-of-tickets-layer";
import { useMapNotices } from "./use-map-notices";
import { withLearningTickets } from "./ticket-wiring";
import { downloadCatalogOf, downloadSettingsNav } from "./download-settings-nav";
import { useDownloadGate, withDownloadGate } from "./use-download-gate";
import { useLearningTickets } from "./use-learning-tickets";
import { useTesterAccess } from "./use-tester-access";
import { usePlans } from "./use-plans";
import type { AppProgressSeed, AppProps } from "./app-props";
import type { AppSessionControl } from "./leave-app.contract";
import type { CatalogReviewItem } from "./catalog-review";
import "./app.css";

const noProgressSeed: AppProgressSeed = {};

// 루트 구성의 몸통입니다(`App`이 key로 세웁니다) — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다(ADR-0003 D5).
export function AppSession({
  progressSeed = noProgressSeed,
  phoneSignIn = productPhoneSignIn,
  notificationEventSink = null,
  settingsEventSink = null,
  entryEventSink = null,
  episodeIntroEventSink = null,
  analyticsUser = null,
  start,
  exit,
  onLeaveApp,
  episodeContent: sourceContent,
  stagedContentReady = 0,
  applyStagedContent,
  downloadControls,
}: AppProps & AppSessionControl & AppSessionContent) {
  // 이 리듀서를 부르는 유일한 자리입니다. `dispatch`는 셸에 콜백으로 내려갑니다 — 셸은 `NavAction`도 `dispatch`도
  // 받지 않습니다(ADR-0007 D3). 초기값은 `entryInitialNav`(부팅 진입 스택 `[{ name: "splash" }]`)입니다.
  const [nav, dispatch] = useReducer(navReducer, start);

  // 고른 언어(= UI 언어)입니다. 첫 렌더에 저장값을 읽고, Provider가 이 언어의 문구표를 내립니다.
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage>(loadUiLanguage);
  // 콘텐츠의 영어 칸을 UI 언어 번역으로 바꾼 판과 카탈로그 구획입니다 — 아래 모든 화면이 받습니다(ADR-0091 D2).
  const { episodeContent, catalogSections } = useSessionCatalog(sourceContent, entryLanguage);
  // 앱이 누구로 도는지입니다(ADR-0111) — 설정 행 구성이 읽고, 결선이 전이를 적습니다.
  const [accountState, setAccountState] = useAccountState();

  // 떠난 뒤 새로 선 세션이면 결과를 한 번 낭독합니다 — 화면이 통째로 바뀌어 달리 알 길이 없습니다.
  useEffect(() => {
    if (exit !== null) announce(uiCopyFor(entryLanguage).settings.exitAnnouncement[exit]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const sessionWiring = useSessionOptions();
  // 한 유닛의 활동들이 지나오며 쌓는 결과입니다. 유닛 하나가 활동 여럿을 잇고 평가는 마지막에 한 번만 돌므로,
  // 그때까지의 정오를 여기 모읍니다(catalog-lesson-wiring.ts). 건너뛴 문항 수도 같은 자리 · 같은 모양입니다 —
  // 둘이 함께 만들어지고 함께 버려져야 수가 새지 않습니다.
  const [pendingResults, setPendingResults] = useState<readonly AnswerResult[]>([]);
  const [pendingSkippedCount, setPendingSkippedCount] = useState(0);
  // 첫 시도에 틀린 채점 문항입니다 — 마지막 활동 뒤 다시 풀기 줄이 됩니다(catalog-lesson-finish.ts). 위 둘과 함께 버립니다.
  const [pendingMistakes, setPendingMistakes] = useState<readonly CatalogReviewItem[]>([]);
  // 「천천히」는 레슨 하나 동안만 이어집니다 — 시작 · 나가기 · 끝에서 되돌립니다(저장하지 않음).
  const [listenPace, setListenPace] = useState<ListenPace>(initialListenPace);
  const finishGuard = useCatalogFinishGuard();
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
    ...sessionWiring,
    pendingResults,
    setPendingResults,
    pendingSkippedCount,
    pendingMistakes,
    setPendingMistakes,
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
    downloadControls,
    downloadCatalog: () => downloadCatalogOf(episodeContent, catalogSections, catalogProgress),
    accountState,
    setAccountState,
  });
  useMessengerWalletSync(screens.coinCount);
  useNewFriendBackfill(progress.hasLoadedProgress, catalog, episodeIntroEventSink);
  const screenNow = currentScreen(nav);
  // 앱 사용 중 받아진 바뀐 판은 여정맵 루트(열린 에피소드 화면 · 겹침 없음)에서 바로 바꿔 끼웁니다(ADR-0078 D4 정정).
  const atMapRoot = nav.entry.length === 0 && screenNow.name === "journey-map" && !screenLayerOpen;
  const gateNav = downloadSettingsNav(dispatch);
  const downloadGate = useDownloadGate(downloadControls, catalog, atMapRoot, progress, gateNav);
  const plans = usePlans(accountState === "signed-in", dispatch, episodeIntroEventSink); // ADR-0144
  const wiring = withDownloadGate(
    withLearningTickets({ ...screens, plans }, tickets, progress, catalogSections),
    downloadGate,
  );
  const messengerTabBadge = useMessengerTabBadge(wiring, nav.tab); // 하단 탭 NEW(2026-11-13)
  useSurfaceSessions(nav.entry.length === 0 ? nav.tab : null, episodeIntroEventSink); // D3 목적 구분

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

  useTrackingAuthorizationPrompt(nav.entry.length === 0 && screenNow.name === "journey-map");
  const showsNavigator = showsTabNavigator(nav);
  useEffect(() => {
    if (atMapRoot && stagedContentReady > 0) applyStagedContent?.();
  }, [atMapRoot, stagedContentReady, applyStagedContent]);
  // 지도 루트의 일회성 안내 — 엽전 출시 · 채팅 모달(ADR-0140) 다음 끝낸 에피소드 업데이트 안내(시안 G-A).
  const notices = useMapNotices({
    wiring,
    catalog: episodeContent.catalog,
    sections: catalogSections,
    progress: catalogProgress,
    localCoins: progress.headerCoinCount,
    idle:
      progress.hasLoadedProgress &&
      atMapRoot &&
      tickets.outOfTickets === null &&
      progress.episodeSurvey === null &&
      !progress.streakCelebration,
    onStartChatting: () => dispatch({ type: "switchTab", tab: "messenger" }),
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
            className={appShellClassName(screenNow.name === "splash", entryLanguage)}
            data-testid="app-shell"
            style={{
              paddingTop: `${shellInsets.top}px`,
              paddingBottom: `${bottomLayout.shellPaddingBottom}px`,
              paddingLeft: `${shellInsets.left}px`,
              paddingRight: `${shellInsets.right}px`,
            }}
          >
            <view className="app-content">
              {renderAppContent(screenNow, wiring)}
              {/* 탭 루트에서는 전역 머리가 콘텐츠 위에 겹칩니다. */}
              {showsNavigator && appHeaderVisibleOn(screenNow) ? (
                <AppHeader
                  top={shellHeaderTop(screenNow, insets)}
                  streakDays={progress.streakDays}
                  trophyCount={progress.headerTrophyCount}
                  coinCount={notices.coinCount}
                  streakReward={notices.streakReward}
                  celebrateStreak={progress.streakCelebration}
                  onStreakCelebrated={progress.onStreakCelebrated}
                  statBump={progress.wiring}
                  tickets={tickets.header}
                  unlimitedPass={testerAccess ? guestUnlimitedPass : undefined}
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
                badges={messengerTabBadge}
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
            {/* 티켓 없이 새 레슨을 열려 하면 어느 화면 위에서든 가운데 대화상자가 뜹니다(시안 E6m · 요금제 카드 ADR-0144). */}
            <OutOfTicketsLayer dialog={tickets.outOfTickets} offerFor={plans?.ticketsOffer} />
            {downloadGate.layer}
            {notices.layer}
          </view>
        </ErrorBoundary>
      </FirstUnitGuideProvider>
    </UiCopyContext.Provider>
  );
}
