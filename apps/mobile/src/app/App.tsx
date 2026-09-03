import { useReducer } from "@lynx-js/react";

import { BottomNavigator } from "../components/BottomNavigator";
import { HomeScreen } from "../screens/home/HomeScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { RoleplayListScreen } from "../screens/roleplay-list/RoleplayListScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, initialNav, navReducer, type Screen } from "./navigation";

import "./app.css";

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
export function App() {
  // 이 리듀서를 부르는 유일한 자리다. `dispatch`는 셸에 콜백으로 내려간다 —
  // 셸은 `NavAction`도 `dispatch`도 받지 않는다 (ADR-0007 D3).
  const [nav, dispatch] = useReducer(navReducer, initialNav);

  return (
    <ErrorBoundary>
      <view className="app">
        <view className="app-content">{renderScreen(currentScreen(nav))}</view>
        <BottomNavigator
          tab={nav.tab}
          onSelectTab={(tab) => dispatch({ type: "switchTab", tab })}
        />
      </view>
    </ErrorBoundary>
  );
}

// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡는다.
function renderScreen(screen: Screen) {
  switch (screen.name) {
    case "home":
      return <HomeScreen />;
    case "journey-map":
      return <JourneyMapScreen />;
    case "roleplay-list":
      return <RoleplayListScreen />;
    case "settings":
      return <SettingsScreen />;
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
