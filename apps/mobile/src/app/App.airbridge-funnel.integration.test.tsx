import { openSettingsFromMore } from "./test-helpers/more-menu";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { memoryMilestoneStore } from "./test-helpers/airbridge-events-harness";
import type { AnalyticsEvent, AnalyticsEventSinks } from "../lib/analytics.contract";
import { productEventSinks } from "../lib/airbridge-events-module";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { plansTestIds as ids } from "../screens/plans/plans.contract";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(AF-I1 ~ I2): Airbridge 소재 테스트 깔때기(ADR-0063 적용 기록 2026-11-24) — 설정 → Plans → Yearly → Continue의
// 요금제 이벤트가 진입점 조립(`productEventSinks`) → 매핑 → `NativeModules.AirbridgeEventsModule.trackEvent`까지 가는가, 모듈이
// 없는 빌드(값 없음)에서는 0회이고 PostHog 쪽 sink에는 그대로 가는가. 대역은 경계뿐 — 플래그 · 요금제 RPC · 저장소 · fetch · 호스트 모듈.

vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => true,
  purchasesEnabled: () => false,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({ catalog: async () => catalogV1, entitlements: async () => null }),
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

type TrackCall = readonly [string, Record<string, unknown>];

/** 호스트 모듈(있으면) · 저장소 · fetch를 세우고, 진입점 조립으로 sink를 만들어 App을 그립니다. */
async function boot(withHost: boolean): Promise<{ calls: TrackCall[]; posthog: string[] }> {
  const calls: TrackCall[] = [];
  const posthog: string[] = [];
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
    ...(withHost
      ? {
          AirbridgeEventsModule: {
            trackEvent: (category: string, attributes: Record<string, unknown>) =>
              void calls.push([category, attributes]),
          },
        }
      : {}),
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
  const record = (event: AnalyticsEvent) => void posthog.push(event.name);
  const sinks = productEventSinks(
    {
      entryEventSink: record,
      notificationEventSink: record,
      settingsEventSink: record,
      episodeIntroEventSink: record,
    } as unknown as AnalyticsEventSinks,
    memoryMilestoneStore(),
  );
  vi.useFakeTimers();
  render(<App {...(sinks as unknown as object)} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return { calls, posthog };
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const tap = (testId: string) => act(() => void fireEvent.tap(screen.getByTestId(testId), {}));

async function plansYearlyContinue(): Promise<void> {
  openSettingsFromMore();
  await flush();
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId("ui-lynx-settings-group-item-plans")).getByTestId(
          "ui-lynx-settings-cell",
        ),
        {},
      ),
  );
  await flush();
  tap(ids.yearly);
  tap(ids.continue);
  await flush();
}

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("AF-I1 호스트 모듈이 있으면 요금제 보기 · 고름 · 구매 단추가 Product List View · plan_selected · Initiate Checkout으로 간다", async () => {
  const { calls, posthog } = await boot(true);
  await plansYearlyContinue();
  expect(screen.getByTestId(ids.notice)).toHaveTextContent("Payments are coming soon");
  expect(calls.map(([category]) => category)).toEqual([
    "airbridge.ecommerce.productList.viewed",
    "plan_selected",
    "airbridge.initiateCheckout",
  ]);
  expect(calls[0]?.[1]).toStrictEqual({ productListID: "plans_compare", label: "settings" });
  expect(calls[1]?.[1]).toStrictEqual({ label: "settings", action: "premium.yearly" });
  expect(calls[2]?.[1]).toMatchObject({
    label: "settings",
    action: "plan",
    type: "preview",
    products: [expect.objectContaining({ productID: "duru.premium.yearly.v1", quantity: 1 })],
  });
  expect(posthog).toEqual(
    expect.arrayContaining(["plans_viewed", "plan_selected", "purchase_intent"]),
  );
});

test("AF-I2 호스트 모듈이 없는 빌드(값 없음)는 trackEvent 0이고 PostHog 쪽 sink에는 같은 이벤트가 간다", async () => {
  const { calls, posthog } = await boot(false);
  await plansYearlyContinue();
  expect(calls).toEqual([]);
  expect(posthog).toEqual(
    expect.arrayContaining(["plans_viewed", "plan_selected", "purchase_intent"]),
  );
});
