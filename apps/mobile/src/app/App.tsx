import { useGlobalProps, useReducer, useState } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import type { AnalyticsIdentifyAppProps } from "../lib/analytics.contract";
import type { AnswerResult } from "../lib/answer-result";
import type { EntryAppProps } from "../lib/entry-flow";
import { loadUiLanguage } from "../lib/ui-language";
import type { EntryLanguage } from "../lib/entry-language";
import { safeAreaInsetsFrom, zeroSafeAreaInsets } from "../lib/safe-area";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { initialSessionOptions } from "../lib/session-options";
import type { SessionOptions } from "../lib/session-options";
import { isMapItemComplete, journeyMapSections } from "../screens/journey-map/journey-map";
import { roleplaySectionsFrom } from "../screens/roleplay-list/roleplay-list";
import { premiumRoleplayItemsFor } from "../screens/roleplay-list/roleplay-premium-items";
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
import { entryInitialNav } from "./nav-state";
import type { Screen } from "./nav-state";
import { renderScreen } from "./render-screen";
import { screenWiring } from "./screen-wiring";

import "./app.css";

// 루트 구성입니다 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다(ADR-0003 D5).
// `phoneCallEventSink`는 메신저·비주얼 노벨과 같은 방식으로 App 경계에서 `null`로 정규화됩니다.
export type { AppJourneySeed } from "./journey-progress";

export type AppSeedProps = {
  readonly journeySeed?: AppJourneySeed;
  /**
   * 이미 끝낸 표지 **유닛**입니다. 없으면 빈 목록 — 그러면 그 에피소드의 나머지 유닛이 전부
   * 잠긴 채로 섭니다(D6). 표지 뒤의 동작을 보려는 자리가 씁니다. 제품 진입점은 주지 않습니다.
   */
  readonly completedEpisodeIntroIds?: readonly EpisodeIntroUnitId[];
  /**
   * 에피소드의 서사 전개를 찾는 함수입니다. 없으면 제품의 표(`episodePrologueFor`)를 씁니다.
   * 다른 형식(통화 · 메신저)의 서사를 보려는 자리가 바꿔 끼웁니다.
   */
  readonly episodePrologueFor?: (episodeId: string) => EpisodePrologue | undefined;
  /** 최종 테스트를 찾는 함수입니다. 없으면 제품의 표(`episodeFinalTestFor`)를 씁니다. */
  readonly episodeFinalTestFor?: (unitId: EpisodeFinalUnitId) => EpisodeFinalTest;
  /** 부팅할 때 가진 젬 수(기본 0)입니다. 결제가 없어 젬이 늘 길이 없으므로 integration만 씁니다. */
  readonly initialGemCount?: number;
  /** 로그인의 전화번호 수단입니다. 없으면 제품 값(`productPhoneSignIn` — 지금은 숨김)입니다. */
  readonly phoneSignIn?: PhoneSignInVisibility;
};

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
    screen.name === "journey-entry"
  );
}

export function App({
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
  analyticsIdentify = null,
}: MessengerAppProps &
  VisualNovelAppProps &
  PhoneCallAppProps &
  NotificationAppProps &
  SettingsAppProps &
  EntryAppProps &
  EpisodeIntroAppProps &
  AnalyticsIdentifyAppProps &
  AppSeedProps = {}) {
  // 이 리듀서를 부르는 유일한 자리입니다. `dispatch`는 셸에 콜백으로 내려갑니다
  // — 셸은 `NavAction`도 `dispatch`도 받지 않습니다(ADR-0007 D3).
  // 초기값이 `entryInitialNav`입니다 — 부팅이 진입 스택 `[{ name: "splash" }]`로
  // 시작합니다. `initialNav` 자신은 안 바뀝니다 — 그래서 이 한 줄이 부팅 화면을
  // 바꾸는 유일한 자리입니다.
  const [nav, dispatch] = useReducer(navReducer, entryInitialNav);

  // 고른 언어(= UI 언어)입니다. 첫 렌더에 저장값을 읽고, Provider가 이 언어의 문구표를 내립니다.
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage>(loadUiLanguage);

  // **진행(완료 스텝 수)의 진실의 출처입니다.** 스텝 상태는 여기서 파생되고(`stepStatusAt`),
  // 데이터에도 `Nav`에도 적지 않습니다 — 진행은 라우팅 상태가 아닙니다(ADR-0007 D3).
  // **영속하지 않습니다**(ADR-0007 D1 — 저장소에 넣는 것은 로그인 세션뿐입니다). 앱을 다시
  // 켜면 진행이 `initialCompletedStepCount`로 돌아가는 것이 정상입니다.
  const [completedStepCount, setCompletedStepCount] = useState(journeySeed.completedStepCount);
  const [completedMessengerUnitIds, setCompletedMessengerUnitIds] = useState<
    readonly MessengerUnitId[]
  >(journeySeed.completedMessengerUnitIds);
  const [completedPhoneCallUnitIds, setCompletedPhoneCallUnitIds] = useState<
    readonly PhoneCallUnitId[]
  >(journeySeed.completedPhoneCallUnitIds);
  const [visualNovelProgress, setVisualNovelProgress] = useState<VisualNovelProgress>(
    journeySeed.visualNovelProgress,
  );
  // 끝낸 최종 테스트입니다. 에피소드의 마지막 항목이라, 이것까지 끝나야 롤플레이가 열립니다.
  const [completedEpisodeFinalIds, setCompletedEpisodeFinalIds] = useState<
    readonly EpisodeFinalUnitId[]
  >(journeySeed.completedEpisodeFinalIds);
  // 남아 있는 알림입니다. 지운 알림은 세션 동안만 빠집니다 — **영속하지 않습니다**
  // (ADR-0007 D1). 앱을 다시 켜면 `notificationList`로 돌아갑니다.
  const [notifications, setNotifications] = useState<readonly NotificationItem[]>(notificationList);
  // 세션 옵션의 진실의 출처입니다. **저장소 모듈을 import하지도 부르지도
  // 않습니다**(ADR-0007 D1) — 앱을 다시 켜면 `initialSessionOptions`로
  // 돌아갑니다.
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>(initialSessionOptions);
  // 한 스텝의 활동들이 지나오며 쌓는 결과입니다. 유닛 하나가 활동 여럿을 잇고 평가는
  // 마지막에 한 번만 돌므로, 그때까지의 정오를 여기 모읍니다(journey-wiring.ts).
  const [pendingResults, setPendingResults] = useState<readonly AnswerResult[]>([]);
  // 같은 스텝에서 사용자가 건너뛴 문항 수입니다. `pendingResults`와 **같은 자리에 같은
  // 모양으로** 듭니다 — 건너뛰기가 있는 활동이 스텝의 어느 자리에 오든 수가 새지
  // 않게 하려면 둘이 함께 만들어지고 함께 버려져야 합니다.
  const [pendingSkippedCount, setPendingSkippedCount] = useState(0);
  // 끝낸 표지 유닛입니다. 다른 특별 유닛의 완료 목록과 같은 축입니다(ADR-0024 D6) —
  // 「봤다」가 아니라 「끝냈다」이고, 세는 것도 에피소드가 아니라 유닛입니다.
  // **영속하지 않습니다**(ADR-0007 D1) — 앱을 다시 켜면 표지가 다시 섭니다.
  const [completedEpisodeIntroIds, setCompletedEpisodeIntroIds] = useState<
    readonly EpisodeIntroUnitId[]
  >(initialCompletedEpisodeIntroIds);
  // 가진 젬 수입니다. 결제 서비스가 아직 없어 바뀌는 길이 없고, `Pay`는 「결제 준비 중」
  // 안내만 띄웁니다. 결제가 붙으면 setter가 여기 생깁니다.
  const [gemCount] = useState(initialGemCount);
  // 탭 루트 화면 안에 겹침 레이어가 떠 있는가입니다. 화면이 알려 오고(`onScreenLayerChange`)
  // 전역 머리가 그 동안 낭독에서 빠집니다. 화면이 내려가면 화면이 스스로 `false`를
  // 알립니다.
  const [screenLayerOpen, setScreenLayerOpen] = useState(false);

  // 롤플레이 구획입니다. **진행에서 파생합니다** — 에피소드는 여정에서 그 에피소드의
  // 항목을 전부 끝냈을 때 열리고, 그 판정의 출처는 위의 진행 넷입니다. 상태로 따로 두면
  // 진행과 어긋날 자리가 생깁니다(ADR-0007 D3).
  const roleplaySections = roleplaySectionsFrom(
    journeyMapSections,
    (item) =>
      isMapItemComplete(item, {
        completedStepCount,
        completedEpisodeIntroIds,
        completedMessengerUnitIds,
        completedPhoneCallUnitIds,
        completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(visualNovelProgress),
        completedEpisodeFinalIds,
      }),
    premiumRoleplayItemsFor,
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
    analyticsIdentify,
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
    setSessionOptions,
    pendingResults,
    setPendingResults,
    completedEpisodeIntroIds,
    setCompletedEpisodeIntroIds,
    pendingSkippedCount,
    setPendingSkippedCount,
    roleplaySections,
    entryLanguage,
    setEntryLanguage,
  });

  // 호스트가 LynxView를 전체 화면으로 띄우므로 셸이 가려지는 가장자리만큼
  // 안쪽 여백을 잡습니다. 여백은 셸 배경이 칠하고, 스플래시일 때만 그 배경이
  // 브랜드색입니다(lib/safe-area.ts).
  //
  // 아래쪽만 예외입니다 — 바텀 네비게이션이 서면 셸은 아래를 비우지 않습니다. 바가
  // 화면 바닥까지 배경을 칠하고 홈 인디케이터를 피하는 여백을 스스로 지기 때문입니다.
  // iOS 기본 탭바와 같은 형태입니다.
  const screenNow = currentScreen(nav);
  const showsNavigator = showsTabNavigator(nav);
  // 가장자리까지 그림을 까는 화면은 셸이 여백을 잡지 않습니다 — 셸 배경이 칠하는 띠가
  // 그림을 끊습니다. 여백은 화면이 자기 안에서 잡습니다(`wiring.safeAreaInsets`).
  const shellInsets = isFullBleedScreen(screenNow) ? zeroSafeAreaInsets : insets;

  return (
    <UiCopyContext.Provider value={uiCopyFor(entryLanguage)}>
      <ErrorBoundary>
        <view
          className={screenNow.name === "splash" ? "app app-splash" : "app"}
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
            {/* 전역 머리는 바텀 네비게이션과 같은 조건(탭 루트)에서만 섭니다 — 그 위에 쌓인
              화면은 하나의 일을 끝내러 들어온 자리라 자기 머리를 스스로 집니다.

              머리도 콘텐츠 **위에 겹칩니다**(`.app-header`). 스크롤되는 내용이 칩
              사이로 비치는 것이 디자인 의도이고, 내용이 머리에 가리지 않는 일은 화면의 위
              여백이 집니다. 지표는 아직 규칙이 없어 0입니다. */}
            {showsNavigator ? (
              <AppHeader
                streakDays={0}
                trophyCount={0}
                gemCount={gemCount}
                obscured={screenLayerOpen}
                onOpenNotifications={wiring.onOpenNotifications}
              />
            ) : null}
          </view>
          {/* 진입 구간(`entry`가 비지 않은 동안)에는 탭 전환 수단을 보이지
            않습니다 — `enterApp`이 `entry`를 비운 뒤에야 처음 섭니다.

            바는 콘텐츠 **위에 겹칩니다**(`.app-navigator`). 그래야 바 위쪽 모서리
            밖으로 콘텐츠가 비쳐 라운드가 드러납니다. 콘텐츠가 바에 가리지 않는 일은
            화면이 집니다 — 화면 하단 여백이 그 몫입니다. */}
          {showsNavigator ? (
            <view className="app-navigator">
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
    </UiCopyContext.Provider>
  );
}
