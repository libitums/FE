import { useGlobalProps, useReducer, useState } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import type { EntryAppProps } from "../lib/entry-flow";
import { initialEntryLanguage } from "../lib/entry-language";
import type { EntryLanguage } from "../lib/entry-language";
import { safeAreaInsetsFrom } from "../lib/safe-area";
import { initialSessionOptions } from "../lib/session-options";
import type { SessionOptions } from "../lib/session-options";
import { initialCompletedStepCount } from "../screens/journey-map/journey-map";
import type { MessengerAppProps, MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { NotificationAppProps } from "../screens/notifications/notifications.contract";
import type { PhoneCallAppProps, PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { SettingsAppProps } from "../screens/settings/settings.contract";
import { initialVisualNovelProgress } from "../screens/visual-novel/visual-novel";
import type {
  VisualNovelAppProps,
  VisualNovelProgress,
} from "../screens/visual-novel/visual-novel.contract";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, isEntrySection, navReducer } from "./nav-reducer";
import { entryInitialNav } from "./nav-state";
import { renderScreen } from "./render-screen";
import { screenWiring } from "./screen-wiring";

import "./app.css";

// 루트 구성입니다 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모입니다
// (ADR-0003 D5).
//
// `phoneCallEventSink`는 메신저·비주얼 노벨과 같은 방식으로 App 경계에서
// `null`로 정규화됩니다.
export function App({
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
  EntryAppProps = {}) {
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
  const [completedStepCount, setCompletedStepCount] = useState(initialCompletedStepCount);
  const [completedMessengerUnitIds, setCompletedMessengerUnitIds] = useState<
    readonly MessengerUnitId[]
  >([]);
  const [completedPhoneCallUnitIds, setCompletedPhoneCallUnitIds] = useState<
    readonly PhoneCallUnitId[]
  >([]);
  const [visualNovelProgress, setVisualNovelProgress] = useState<VisualNovelProgress>(
    initialVisualNovelProgress,
  );
  // 세션 옵션의 진실의 출처입니다. **저장소 모듈을 import하지도 부르지도
  // 않습니다**(ADR-0007 D1) — 앱을 다시 켜면 `initialSessionOptions`로
  // 돌아갑니다.
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>(initialSessionOptions);

  const wiring = screenWiring({
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
    sessionOptions,
    setSessionOptions,
    entryLanguage,
    setEntryLanguage,
  });

  // 호스트가 LynxView를 전체 화면으로 띄우므로 셸이 가려지는 가장자리만큼
  // 안쪽 여백을 잡습니다. 여백은 셸 배경이 칠하고, 스플래시일 때만 그 배경이
  // 브랜드색입니다(lib/safe-area.ts).
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const screenNow = currentScreen(nav);

  return (
    <ErrorBoundary>
      <view
        className={screenNow.name === "splash" ? "app app-splash" : "app"}
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="app-content">{renderScreen(screenNow, wiring)}</view>
        {/* 진입 구간(`entry`가 비지 않은 동안)에는 탭 전환 수단을 보이지
            않습니다 — `enterApp`이 `entry`를 비운 뒤에야 처음 섭니다. */}
        {isEntrySection(nav) ? null : (
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
        )}
      </view>
    </ErrorBoundary>
  );
}
