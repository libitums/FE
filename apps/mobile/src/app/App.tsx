import { useReducer } from '@lynx-js/react'

import { HomeScreen } from '../screens/home/HomeScreen'
import { ErrorBoundary } from './ErrorBoundary'
import { currentScreen, initialNav, navReducer, type Screen } from './navigation'

// 루트 구성 — 화면 전환 · 에러 경계 · 프로바이더가 여기 모인다 (ADR-0003 D5).
export function App() {
  // 화면이 하나뿐이라 아직 dispatch할 곳이 없다.
  // 두 번째 화면이 생기면 그 화면에 dispatch를 내려준다 (ADR-0007 D3).
  const [nav] = useReducer(navReducer, initialNav)

  return <ErrorBoundary>{renderScreen(currentScreen(nav))}</ErrorBoundary>
}

// switch의 exhaustiveness 검사가 빠진 화면을 컴파일 타임에 잡는다.
function renderScreen(screen: Screen) {
  switch (screen.name) {
    case 'home':
      return <HomeScreen />
    default: {
      const exhaustive: never = screen.name
      return exhaustive
    }
  }
}
