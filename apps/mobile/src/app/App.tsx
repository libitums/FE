import { useReducer, useState } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import { HomeScreen } from "../screens/home/HomeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import {
  completeStep,
  initialCompletedStepCount,
  journeyStepOrdinal,
  type JourneyStepId,
} from "../screens/journey-map/journey-map";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, initialNav, navReducer, type Screen } from "./navigation";

import "./app.css";

// 화면 결선이 `renderScreen`에 넘기는 것. 셸이 소유한 값 하나와 콜백 셋이다.
// **`dispatch`도 `NavAction`도 여기 들어가지 않는다** — 화면은 스택을 모른다
// (ADR-0007 D3). 화면이 받는 것은 "무엇이 일어났다"는 콜백뿐이고, 그것을 무슨
// 네비게이션 동작으로 옮길지는 `App`이 정한다.
type ScreenWiring = {
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
  onExitListening: () => void;
  onFinishListening: (id: JourneyStepId) => void;
};

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
export function App() {
  // 이 리듀서를 부르는 유일한 자리다. `dispatch`는 셸에 콜백으로 내려간다 —
  // 셸은 `NavAction`도 `dispatch`도 받지 않는다 (ADR-0007 D3).
  const [nav, dispatch] = useReducer(navReducer, initialNav);

  // **진행(완료 스텝 수)의 진실의 출처다** (계약 §0.2). 스텝 상태는 여기서 파생되고
  // (`stepStatusAt`), 데이터에도 `Nav`에도 적지 않는다 — 진행은 라우팅 상태가
  // 아니므로 `Nav`에 필드를 더하지 않는다 (ADR-0007 D3).
  //
  // **영속하지 않는다** — 저장소 모듈을 import하지도 호출하지도 않는다
  // (ADR-0007 D1: 저장소 모듈에 넣는 것은 로그인 토큰뿐이다). 앱을 다시 켜면
  // 진행이 `initialCompletedStepCount`로 돌아가는 것이 정상이고 계약이 그것을 적는다.
  const [completedStepCount, setCompletedStepCount] = useState(initialCompletedStepCount);

  const wiring: ScreenWiring = {
    completedStepCount,
    // 시트의 `시작`이 여기로 온다. 목적지는 학습 화면 하나이고, union이 나르는 것은
    // **어느 스텝인가** 하나뿐이다 (계약 §1.3(a)).
    onStartStep: (id) => dispatch({ type: "push", screen: { name: "listening", stepId: id } }),
    // 중도 이탈. **진행을 갱신하지 않는다** (수용 기준 10). `onFinishListening`과
    // 합치지 않는 이유가 이 한 줄의 차이다 (계약 §1.6).
    onExitListening: () => dispatch({ type: "back" }),
    // 완료. 진행을 갱신하고 맵으로 돌아간다 (수용 기준 8·9).
    // 단조성(되돌아가지 않는다)의 정본은 `completeStep`이다 — `Math.max`도
    // 조건 분기도 여기서 다시 쓰지 않는다 (계약 §1.5(a)).
    onFinishListening: (id) => {
      setCompletedStepCount((count) => completeStep(count, id));
      dispatch({ type: "back" });
    },
  };

  return (
    <ErrorBoundary>
      <view className="app">
        <view className="app-content">{renderScreen(currentScreen(nav), wiring)}</view>
        <BottomNavigator
          tab={nav.tab}
          onSelectTab={(tab) => dispatch({ type: "switchTab", tab })}
        />
      </view>
    </ErrorBoundary>
  );
}

// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡는다.
//
// 값(`initialCompletedStepCount` · `journeyStepOrdinal` · `completeStep`)은 App이 읽어
// props로 내린다 — 화면끼리는 타입만 공유한다(계약 §8.4). 그래서 `ListeningScreen`은
// `stepOrdinal`을 계산하지 않고 받는다.
function renderScreen(screen: Screen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "home":
      return <HomeScreen />;
    case "journey-map":
      return (
        <JourneyMapScreen
          completedStepCount={wiring.completedStepCount}
          onStartStep={wiring.onStartStep}
        />
      );
    case "roleplay-list":
      return <RoleplayListScreen />;
    case "settings":
      return <SettingsScreen />;
    case "listening":
      return (
        <ListeningScreen
          stepId={screen.stepId}
          stepOrdinal={journeyStepOrdinal(screen.stepId)}
          onExit={wiring.onExitListening}
          onFinish={wiring.onFinishListening}
        />
      );
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
