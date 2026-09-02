import { useReducer } from "@lynx-js/react";

import { HomeScreen } from "../screens/home/HomeScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import { currentScreen, initialNav, navReducer, type Screen } from "./navigation";

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
export function App() {
  // 화면이 하나뿐이라 아직 dispatch할 곳이 없다.
  // 두 번째 화면이 생기면 그 화면에 dispatch를 내려준다 (ADR-0007 D3).
  const [nav] = useReducer(navReducer, initialNav);

  return <ErrorBoundary>{renderScreen(currentScreen(nav))}</ErrorBoundary>;
}

// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡는다.
//
// LIB-221 뼈대(logic-scaffold): `journey-map` · `roleplay-list` · `settings`는
// navigation.ts의 Screen union에 이제 존재하지만, 그 화면 컴포넌트는 아직 없다
// (ui-scaffold 이후 단계 몫). 여기서는 App.tsx 타입 에러만 없애는 최소 자리
// 표시자를 둔다 — 실제 화면 렌더는 각 화면의 ui 변형이 채운다.
function renderScreen(screen: Screen) {
  switch (screen.name) {
    case "home":
      return <HomeScreen />;
    case "journey-map":
    case "roleplay-list":
    case "settings":
      return null;
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
