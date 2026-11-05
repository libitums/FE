import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층: 탭 루트 사이에서 여정맵을 숨겨 둔다(ADR-0106) — 앱 트리 전체에서 여정 → 롤플레이 → 여정을 오가도
// 지도가 같은 요소로 남고(다시 만들지 않음), 다른 탭에 있는 동안은 숨김 · 낭독 가림이며, 탭 루트가 아닌 화면에서는 지운다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const openTab = (tab: "journey" | "roleplay" | "settings"): void =>
  void fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
const mapBox = () => screen.getByTestId("app-tab-map");

test("TK1. 여정 → 롤플레이 → 여정을 오가도 지도 화면은 같은 요소로 남는다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  const map = screen.getByTestId("journey-map-screen");

  openTab("roleplay");
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBe(map);

  openTab("journey");
  expect(screen.getByTestId("journey-map-screen")).toBe(map);
  expect(screen.queryByTestId("roleplay-list-screen-title")).toBeNull();
});

test("TK2. 롤플레이 · 설정 탭에 있는 동안 지도는 숨김 · 터치 막음 · 낭독 가림이고, 돌아오면 풀린다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);

  for (const tab of ["roleplay", "settings"] as const) {
    openTab(tab);
    expect(mapBox().getAttribute("class")).toContain("app-tab-map-hidden");
    expect(mapBox()).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(mapBox()).toHaveAttribute("user-interaction-enabled", "false");
  }

  openTab("journey");
  expect(mapBox().getAttribute("class")).not.toContain("app-tab-map-hidden");
  expect(mapBox()).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("TK3. 탭 루트가 아닌 화면(설정 › 다운로드)으로 들어가면 지도는 지운다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("settings");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  fireEvent.tap(
    screen
      .getByTestId("ui-lynx-settings-group-item-download")
      .querySelector('[data-testid="ui-lynx-settings-cell"]') as Element,
    {},
  );

  expect(screen.queryByTestId("journey-map-screen") === null).toBe(true);
  expect(screen.queryByTestId("app-tab-map") === null).toBe(true);
});
