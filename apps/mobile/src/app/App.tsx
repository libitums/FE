import { useGlobalProps, useReducer, useState } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import type { AnswerResult } from "../lib/answer-result";
import type { EntryAppProps } from "../lib/entry-flow";
import { initialEntryLanguage } from "../lib/entry-language";
import type { EntryLanguage } from "../lib/entry-language";
import { safeAreaInsetsFrom, zeroSafeAreaInsets } from "../lib/safe-area";
import { initialSessionOptions } from "../lib/session-options";
import type { SessionOptions } from "../lib/session-options";
import {
  initialCompletedStepCount,
  isMapItemComplete,
  journeyMapSections,
} from "../screens/journey-map/journey-map";
import { roleplaySectionsFrom } from "../screens/roleplay-list/roleplay-list";
import { premiumRoleplayItemsFor } from "../screens/roleplay-list/roleplay-premium-items";
import type { MessengerAppProps, MessengerUnitId } from "../screens/messenger/messenger.contract";
import type {
  NotificationAppProps,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import type { PhoneCallAppProps, PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { SettingsAppProps } from "../screens/settings/settings.contract";
import { initialVisualNovelProgress } from "../screens/visual-novel/visual-novel";
import type {
  VisualNovelAppProps,
  VisualNovelProgress,
  VisualNovelUnitId,
} from "../screens/visual-novel/visual-novel.contract";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, navReducer, showsTabNavigator } from "./nav-reducer";
import { notificationList } from "./app-content";
import { entryInitialNav } from "./nav-state";
import type { Screen } from "./nav-state";
import { renderScreen } from "./render-screen";
import { screenWiring } from "./screen-wiring";

import "./app.css";

// 루트 구성입니다 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다
// (ADR-0003 D5).
//
// `phoneCallEventSink`는 메신저·비주얼 노벨과 같은 방식으로 App 경계에서
// `null`로 정규화됩니다.
/**
 * 부팅할 때의 여정 진행입니다. 주지 않으면 제품의 씨앗(`initialCompletedStepCount` · 빈
 * 완료 목록)으로 시작합니다.
 *
 * 있는 이유는 **진행이 열어 주는 화면**입니다. 롤플레이는 에피소드를 다 끝내야 열리는데,
 * 그 상태에 닿으려면 유닛 여덟을 모두 지나야 합니다 — 열린 뒤의 동작을 보려는 자리
 * (integration · 개발 중 확인)가 그 길을 매번 걷지 않게 합니다. 제품 진입점은 이 값을
 * 주지 않습니다.
 */
export type AppJourneySeed = {
  readonly completedStepCount: number;
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly visualNovelProgress: VisualNovelProgress;
};

export type AppSeedProps = {
  readonly journeySeed?: AppJourneySeed;
  /**
   * 서사 표지를 이미 본 에피소드입니다. 없으면 빈 목록 — 어느 에피소드든 유닛을 처음 열
   * 때 표지가 섭니다. 표지 뒤의 동작을 보려는 자리가 표지를 매번 넘기지 않게 합니다.
   * 제품 진입점은 이 값을 주지 않습니다.
   */
  readonly seenEpisodeIntroIds?: readonly string[];
};

const productJourneySeed: AppJourneySeed = {
  completedStepCount: initialCompletedStepCount,
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  visualNovelProgress: initialVisualNovelProgress(),
};

// 비주얼 노벨의 진행은 완료 id 목록이 아니라 상태 하나입니다(유닛이 하나뿐입니다).
// 여정 맵에 내릴 때(`render-screen.tsx`)와 같은 식으로 목록으로 옮깁니다.
function completedVisualNovelUnitIdsFrom(
  progress: VisualNovelProgress,
): readonly VisualNovelUnitId[] {
  return progress.status === "completed" ? ["cafe-arrival-visual-novel"] : [];
}

// 가장자리(상태바 · 홈 인디케이터 뒤)까지 배경을 까는 화면입니다. 서사 표지 · 그 뒤의
// 서사(비주얼 노벨) · 서사 통화는 화면 전체를 한 장면으로 덮습니다(Figma 80-7869 · 79-6304 ·
// 80-7797).
//
// ⟨2026-09-28⟩ **여정 입장도 같은 자리입니다.** 그 화면의 디자인 의도가 「그림을 화면
// 전체에 깐다」인데 셸이 여백을 잡아 위 · 아래에 그림이 닿지 않는 흰 띠가 남았습니다
// (기기에서 확인). 스플래시는 셸 배경색을 바꿔 같은 문제를 풀지만(`app-splash`), 배경이
// 색이 아니라 사진인 둘은 그 방법이 안 통합니다.
function isFullBleedScreen(screen: Screen): boolean {
  return (
    screen.name === "episode-intro" ||
    screen.name === "episode-prologue-call" ||
    screen.name === "episode-narrative" ||
    screen.name === "journey-entry"
  );
}

export function App({
  journeySeed = productJourneySeed,
  seenEpisodeIntroIds: initialSeenEpisodeIntroIds = [],
  messengerEventSink = null,
  visualNovelEventSink = null,
  phoneCallEventSink = null,
  notificationEventSink = null,
  settingsEventSink = null,
  entryEventSink = null,
}: MessengerAppProps &
  VisualNovelAppProps &
  PhoneCallAppProps &
  NotificationAppProps &
  SettingsAppProps &
  EntryAppProps &
  AppSeedProps = {}) {
  // 이 리듀서를 부르는 유일한 자리입니다. `dispatch`는 셸에 콜백으로 내려갑니다
  // — 셸은 `NavAction`도 `dispatch`도 받지 않습니다(ADR-0007 D3).
  //
  // 초기값이 `entryInitialNav`입니다 — 부팅이 진입 스택 `[{ name: "splash" }]`로
  // 시작합니다. `initialNav` 자신은 안 바뀝니다 — 그래서 이 한 줄이 부팅 화면을
  // 바꾸는 유일한 자리입니다.
  const [nav, dispatch] = useReducer(navReducer, entryInitialNav);

  // 고른 언어의 세션 상태입니다 — App `useState`가 소유합니다(화면 둘·깊이
  // 1단계로 전역 상태 도입 조건 미달). 화면을 새로 렌더하면
  // `initialEntryLanguage`로 돌아갑니다(영속하지 않습니다).
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage>(initialEntryLanguage);

  // **진행(완료 스텝 수)의 진실의 출처입니다.** 스텝 상태는 여기서
  // 파생되고(`stepStatusAt`), 데이터에도 `Nav`에도 적지 않습니다 — 진행은
  // 라우팅 상태가 아니므로 `Nav`에 필드를 더하지 않습니다(ADR-0007 D3).
  //
  // **영속하지 않습니다** — 저장소 모듈을 import하지도 호출하지도 않습니다
  // (ADR-0007 D1: 저장소 모듈에 넣는 것은 로그인 토큰뿐입니다,
  // `lib/auth-token.ts`). 앱을 다시 켜면 진행이 `initialCompletedStepCount`로
  // 돌아가는 것이 정상이고 계약이 그것을 적습니다.
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
  // 서사 표지를 본 에피소드입니다. **영속하지 않습니다**(ADR-0007 D1) — 앱을 다시 켜면
  // 표지가 다시 섭니다. 진행이 영속하지 않는 것과 같은 저울입니다.
  const [seenEpisodeIntroIds, setSeenEpisodeIntroIds] = useState<readonly string[]>(
    initialSeenEpisodeIntroIds,
  );

  // 롤플레이 구획입니다. **진행에서 파생합니다** — 에피소드는 여정에서 그 에피소드의
  // 항목을 전부 끝냈을 때 열리고, 그 판정의 출처는 위의 진행 넷입니다. 상태로 따로 두면
  // 진행과 어긋날 자리가 생깁니다(ADR-0007 D3).
  const roleplaySections = roleplaySectionsFrom(
    journeyMapSections,
    (item) =>
      isMapItemComplete(item, {
        completedStepCount,
        completedMessengerUnitIds,
        completedPhoneCallUnitIds,
        completedVisualNovelUnitIds: completedVisualNovelUnitIdsFrom(visualNovelProgress),
      }),
    premiumRoleplayItemsFor,
  );

  const insets = safeAreaInsetsFrom(useGlobalProps());
  const wiring = screenWiring({
    safeAreaInsets: insets,
    messengerEventSink,
    phoneCallEventSink,
    visualNovelEventSink,
    notificationEventSink,
    settingsEventSink,
    entryEventSink,
    dispatch,
    completedMessengerUnitIds,
    setCompletedMessengerUnitIds,
    completedPhoneCallUnitIds,
    setCompletedPhoneCallUnitIds,
    visualNovelProgress,
    setVisualNovelProgress,
    completedStepCount,
    setCompletedStepCount,
    notifications,
    setNotifications,
    sessionOptions,
    setSessionOptions,
    seenEpisodeIntroIds,
    setSeenEpisodeIntroIds,
    pendingResults,
    setPendingResults,
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
        <view className="app-content">{renderScreen(screenNow, wiring)}</view>
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
  );
}
