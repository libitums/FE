// 메인 스레드는 첫 화면(스플래시)만 그립니다(ADR-0149 「줄인 기록」 1). 메인 스레드가 컴포넌트를 렌더하는 길은 첫 렌더 ·
// 첫 동기화 전 `updatePage` · template reload 셋이고 모두 처음 상태(`initialAppStart`)에서 시작합니다(ADR-0031 D8).
// 그 뒤의 화면은 background가 그려 패치로 보냅니다 — 그래서 메인 스레드 번들에서 스플래시 밖 화면 코드를 뺍니다.

import { afterEach, expect, test, vi } from "vitest";

import { initialAppStart } from "./app-start";
import { currentScreen } from "./nav-reducer";
import type { Screen } from "./nav-state";
import { renderAppContent } from "./render-app-content";
import { renderEntryScreen } from "./render-entry-screen";
import type { ScreenWiring } from "./screen-wiring";
import { SplashScreen } from "../screens/splash/SplashScreen";

function onThread(thread: "main" | "background"): void {
  vi.stubGlobal("__MAIN_THREAD__", thread === "main");
  vi.stubGlobal("__BACKGROUND__", thread === "background");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const onSplashTimeout = () => {};
const wiring = { onSplashTimeout } as unknown as ScreenWiring;

test("FS1. 부팅 첫 화면은 스플래시다 — 메인 스레드가 그리는 유일한 화면", () => {
  expect(currentScreen(initialAppStart.nav)).toEqual({ name: "splash" });
});

test("FS2. 메인 스레드의 스플래시는 background와 같은 요소다", () => {
  const splash: Screen = { name: "splash" };
  onThread("main");
  const onMain = renderAppContent(splash, wiring);
  onThread("background");
  const onBackground = renderAppContent(splash, wiring);

  // 요소마다 붙는 내부 번호는 달라 type · props만 맞춥니다.
  const expected = renderEntryScreen(splash, wiring);
  for (const element of [onMain, onBackground] as (typeof expected | null)[]) {
    expect(element?.type).toBe(SplashScreen);
    expect(element?.type).toBe(expected.type);
    expect(element?.props).toEqual(expected.props);
  }
});

test("FS3. 메인 스레드는 스플래시 밖 화면을 그리지 않는다 — 결선을 읽지도 않는다", () => {
  onThread("main");
  const untouched = new Proxy({} as ScreenWiring, {
    get(_, key) {
      throw new Error(`메인 스레드가 결선을 읽었습니다: ${String(key)}`);
    },
  });
  const screens: Screen[] = [
    { name: "journey-map" },
    { name: "settings" },
    { name: "onboarding" },
    { name: "login" },
    { name: "messenger-list" },
    { name: "notifications" },
  ];
  for (const screen of screens) {
    expect(renderAppContent(screen, untouched), screen.name).toBeNull();
  }
});
