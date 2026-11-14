import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { plansTestIds as ids } from "../screens/plans/plans.contract";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(SB-I1 ~ I3): 요금제(ADR-0144) — 기능 플래그를 켠 결선에서 설정 → Plans → 고름 · 연간 → 계속 →
// 꺼진 구매 다리의 안내 · 이벤트. 플래그가 꺼지면(기본) 줄도 RPC도 없다. 대역은 경계뿐 — 플래그 모듈 · 요금제 RPC 모듈 ·
// `StorageModule` · `fetch`(갱신 · 학습 RPC).

const flag = vi.hoisted(() => ({ on: true }));
const rpc = vi.hoisted(() => ({ catalog: null as unknown, calls: 0 }));
vi.mock("../lib/plans-flag", () => ({ plansFeatureEnabled: () => flag.on }));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => {
      rpc.calls += 1;
      return rpc.catalog;
    },
    entitlements: async () => null,
  }),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "plans-user" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "plans-user" },
});

let events: EpisodeIntroEvent[] = [];

async function boot(): Promise<void> {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", (url: string) => {
    if (url.includes("grant_type=refresh_token"))
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const body = name === "load_learning_progress" ? "null" : "";
    return Promise.resolve({ status: body === "" ? 204 : 200, text: async () => body });
  });
  vi.useFakeTimers();
  render(<App episodeIntroEventSink={(event) => events.push(event)} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const tap = (testId: string) => act(() => void fireEvent.tap(screen.getByTestId(testId), {}));
const openSettings = () => tap("ui-lynx-bottom-navigator-item-settings");
const planRow = "ui-lynx-settings-group-item-plans";

beforeEach(() => {
  flag.on = true;
  rpc.catalog = catalogV1;
  rpc.calls = 0;
  events = [];
});
afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("SB-I1 플래그 켬 · 로그인: 설정 → Plans → Premium 고름 → Yearly → Continue → 안내, 이벤트 둘", async () => {
  await boot();
  openSettings();
  await flush();
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId(planRow)).getByTestId("ui-lynx-settings-cell"),
        {},
      ),
  );
  await flush();
  expect(present(ids.screen)).toBe(true);
  expect(screen.getByTestId(ids.card("premium")).getAttribute("data-selected")).toBe("true");
  expect(events.filter((e) => e.name === "plans_viewed")).toEqual([
    expect.objectContaining({ placement: "settings", view: "compare", surface: "learning" }),
  ]);
  tap("ui-lynx-option-selector-item-yearly");
  tap(ids.continue);
  await flush();
  expect(screen.getByTestId(ids.notice)).toHaveTextContent("Purchases aren't available yet.");
  expect(events.filter((e) => e.name === "plan_selected")).toEqual([
    expect.objectContaining({ placement: "settings", plan: "premium", period: "yearly" }),
  ]);
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"),
        {},
      ),
  );
  await flush();
  expect(present(ids.screen)).toBe(false);
  expect(present(planRow)).toBe(true);
});

test("SB-I2 플래그 꺼짐(기본): 설정에 Plans 줄이 없고 요금제 RPC도 부르지 않는다", async () => {
  flag.on = false;
  await boot();
  openSettings();
  await flush();
  expect(present("settings-screen-list")).toBe(true);
  expect(present(planRow)).toBe(false);
  expect(rpc.calls).toBe(0);
});

test("SB-I3 요금제를 못 읽으면(null) Plans 화면은 실패 안내만 — 앱은 그대로", async () => {
  rpc.catalog = null;
  await boot();
  openSettings();
  await flush();
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId(planRow)).getByTestId("ui-lynx-settings-cell"),
        {},
      ),
  );
  await flush();
  expect(screen.getByTestId(ids.empty)).toHaveTextContent("Couldn't load plans.");
  expect(present(ids.continue)).toBe(false);
});
