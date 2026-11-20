import { openSettingsFromMore } from "./test-helpers/more-menu";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { setPlanAccess } from "../lib/plan-access";
import { subscribedTo } from "../screens/plans/plans-subscribed.test-support";
import { catalogV1 } from "../screens/plans/plans.test-support";

// `integration` 계층(SH-I1 ~ I6, ADR-0160): 하나의 상점 — 머리 엽전 칩 · 둘째 줄 요금제 칩 · 티켓 모달 Go unlimited가 같은 상점을 열고,
// 탭 전환 · 보기 이벤트가 나가며, 구독 구매가 끝나 권한이 바뀌면 알림 한 번. 플래그가 꺼지면 지금 그대로. 대역은 경계뿐(플래그 · 요금제 RPC ·
// 호스트 구매 모듈 · `StorageModule` · `fetch`). 서버 따라잡기의 2초 기다림만 즉시로 바꿉니다.

const flag = vi.hoisted(() => ({ on: true }));
const rpc = vi.hoisted(() => ({
  catalog: null as unknown,
  calls: 0,
  entitlementCalls: 0,
  // 권한 RPC가 차례로 돌려줄 값 — 마지막 값이 남습니다.
  entitlements: [] as unknown[],
}));
const pay = vi.hoisted(() => ({ on: true }));
const learner = vi.hoisted(() => ({ country: null as string | null }));
// 호스트 구매 모듈(RevenueCat, ADR-0144 2단계) — null이면 SDK 키가 없는 빌드(모듈 없음).
const host = vi.hoisted(() => ({
  purchases: null as null | {
    storefront: string | null;
    products: readonly Record<string, unknown>[];
    configured: string[]; // 사용자 맞춤(configure)은 PU-U1 · U2가 본다 — 동기화 기억이 모듈 수명이라 여기서는 세지 않는다
  },
}));
vi.mock("../lib/plans-flag", () => ({
  plansFeatureEnabled: () => flag.on,
  purchasesEnabled: () => pay.on,
}));
vi.mock("../lib/plans-api", async (original) => ({
  ...(await original<typeof import("../lib/plans-api")>()),
  plansClient: () => ({
    catalog: async () => {
      rpc.calls += 1;
      return rpc.catalog;
    },
    entitlements: async () => {
      rpc.entitlementCalls += 1;
      return rpc.entitlements.length > 1 ? rpc.entitlements.shift() : rpc.entitlements[0];
    },
    balance: async () => null,
  }),
}));
vi.mock("../lib/purchase-refresh", async (original) => ({
  ...(await original<typeof import("../lib/purchase-refresh")>()),
  sleep: async () => {},
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
    ...(learner.country === null
      ? []
      : ([
          [
            "libitum.learner-profile.plans-user",
            JSON.stringify({ v: 1, name: "Mina", countryCode: learner.country, sync: "synced" }),
          ],
        ] as const)),
  ]);
  const purchases = host.purchases;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...(purchases === null
      ? {}
      : {
          PurchasesModule: {
            configure: (userId: string, callback: (payload: unknown) => void) => {
              purchases.configured.push(userId);
              callback({ status: "ok" });
            },
            signOut: (callback: (payload: unknown) => void) => callback({ status: "ok" }),
            offerings: (callback: (payload: unknown) => void) =>
              callback({ status: "ok", products: purchases.products }),
            storefront: (callback: (payload: unknown) => void) =>
              callback(
                purchases.storefront === null
                  ? { status: "failed" }
                  : { status: "ok", country: purchases.storefront },
              ),
            purchase: (id: string, callback: (payload: unknown) => void) =>
              callback({ status: "purchased", productId: id }),
            restore: (callback: (payload: unknown) => void) =>
              callback({ status: "restored", active: 1 }),
          },
        }),
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
const free = { tier: "free", unlimitedTickets: false, entitlements: [] };
const named = (name: string) => events.filter((event) => event.name === name);

beforeEach(() => {
  flag.on = true;
  rpc.catalog = catalogV1;
  rpc.calls = 0;
  rpc.entitlementCalls = 0;
  rpc.entitlements = [free];
  pay.on = false;
  host.purchases = { storefront: "US", products: [], configured: [] };
  learner.country = null;
  events = [];
});
afterEach(() => {
  cleanup();
  setPlanAccess(null);
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("SH-I1 지도 엽전 칩 → 상점 엽전 탭(탭 · 요금제 줄) → Plans 탭: shop_tab_switched · plans_viewed(coin_shop, free), 닫으면 지도", async () => {
  await boot();
  tap("top-bar-coins");
  expect(screen.getByTestId("shop-tab-coins").getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId("shop-promo")).toHaveTextContent("with Premium");
  tap("shop-tab-plans");
  expect(present("plans-card-premium")).toBe(true);
  expect(named("shop_tab_switched")).toEqual([
    expect.objectContaining({ from: "coins", to: "plans", surface: "learning" }),
  ]);
  expect(named("plans_viewed")).toEqual([
    expect.objectContaining({ placement: "coin_shop", view: "compare", currentPlan: "free" }),
  ]);
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
        {},
      ),
  );
  expect(present("coin-shop-screen")).toBe(false);
});

test("SH-I2 여정 지도 둘째 줄 PLANS 칩 → 상점 Plans 탭(header_chip) · 다른 탭 루트에는 칩이 없다", async () => {
  await boot();
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PLANS");
  tap("header-plan-chip");
  expect(screen.getByTestId("shop-tab-plans").getAttribute("data-selected")).toBe("true");
  expect(named("plans_viewed")).toEqual([
    expect.objectContaining({ placement: "header_chip", currentPlan: "free" }),
  ]);
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
        {},
      ),
  );
  openSettingsFromMore();
  await flush();
  expect(present("header-plan-chip")).toBe(false);
});

test("SH-I3 티켓 칩 → 모달의 Go unlimited($3.99/mo) → Unlimited Tickets를 고른 Plans 탭 · 태그(tickets_chip)", async () => {
  await boot();
  tap("top-bar-tickets");
  expect(screen.getByTestId("ticket-modal-go-unlimited")).toHaveTextContent(
    "Go unlimited · $3.99/mo",
  );
  tap("ticket-modal-go-unlimited");
  expect(present("ticket-modal")).toBe(false);
  expect(screen.getByTestId("plans-card-unlimited_tickets").getAttribute("data-selected")).toBe(
    "true",
  );
  expect(present("plans-tickets-tag")).toBe(true);
  expect(named("plans_viewed")).toEqual([expect.objectContaining({ placement: "tickets_chip" })]);
});

test("SH-I4 플래그 꺼짐(운영 기본) — 상점은 엽전만, 둘째 줄 칩 · 모달 줄 없음", async () => {
  flag.on = false;
  await boot();
  expect(present("header-plan-chip")).toBe(false);
  tap("top-bar-coins");
  expect(present("coin-shop-screen")).toBe(true);
  expect(present("shop-tab-plans")).toBe(false);
  expect(present("shop-promo")).toBe(false);
});

test("SH-I5 구독 중(Chat Plus)이면 칩이 CHAT+이고 티켓 칩은 숫자 그대로, 상점 Plans 탭은 지금 카드 · Upgrade", async () => {
  pay.on = true;
  rpc.entitlements = [subscribedTo("chat_plus")];
  await boot();
  await flush();
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("CHAT+");
  expect(present("top-bar-tickets-infinity")).toBe(false);
  tap("header-plan-chip");
  expect(screen.getByTestId("plans-card-chat_plus").getAttribute("data-current")).toBe("true");
  expect(screen.getByTestId("plans-continue")).toHaveTextContent("Upgrade to Premium");
  expect(named("plans_viewed")).toEqual([
    expect.objectContaining({ placement: "header_chip", currentPlan: "chat_plus" }),
  ]);
});

test("SH-I6 Plans 탭에서 Unlimited Tickets를 사면 상점이 닫히고, 권한이 바뀐 뒤 알림 한 번 · 칩 TICKETS", async () => {
  pay.on = true;
  rpc.entitlements = [free, free, subscribedTo("unlimited_tickets")];
  await boot();
  await flush();
  tap("top-bar-tickets");
  tap("ticket-modal-go-unlimited");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  // 상점은 결제 직후가 아니라 서버 권한이 바뀐 뒤 닫힙니다(ADR-0163 D3) — 따라잡기가 끝날 만큼 비웁니다.
  for (let i = 0; i < 12; i += 1) await flush();
  expect(present("coin-shop-screen")).toBe(false);
  expect(named("plan_selected")).toEqual([
    expect.objectContaining({
      placement: "tickets_chip",
      from: "free",
      to: "unlimited_tickets",
      kind: "new",
    }),
  ]);
  // 첫 유닛 안내가 지도를 덮은 동안은 알림이 기다립니다 — 머리가 가려진 채 4초가 지나가지 않게(ADR-0160).
  expect(present("subscription-toast")).toBe(false);
  act(
    () =>
      void fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" }),
  );
  expect(screen.getByTestId("subscription-toast")).toHaveTextContent("Unlimited Tickets is on");
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("TICKETS");
  expect(screen.getByTestId("header-plan-chip").getAttribute("data-pulse")).toBe("true");
});

test("SH-I7 복원으로 권한이 생기면 칩은 바뀌어도 구독 성공 알림은 없다(리뷰 W1)", async () => {
  pay.on = true;
  rpc.entitlements = [free, subscribedTo("unlimited_tickets")];
  await boot();
  await flush();
  tap("header-plan-chip");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-restore"), {});
  });
  for (let i = 0; i < 4; i += 1) await flush();
  act(
    () =>
      void fireEvent.tap(
        within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
        {},
      ),
  );
  act(
    () =>
      void fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" }),
  );
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("TICKETS");
  expect(present("subscription-toast")).toBe(false);
});

test("SH-I8 올림 뒤 내림(2026-11-19 07:53 기기) — 새 요금제 줄 없이 pending만 생겨도 「starts 날짜」 알림 한 번, 칩은 PREMIUM", async () => {
  pay.on = true;
  const premium = subscribedTo("premium");
  const [premiumRow] = premium.entitlements;
  const staleTickets = {
    ...subscribedTo("unlimited_tickets").entitlements[0]!,
    pendingProductId: "duru.premium.monthly.v1",
  };
  const before = { ...premium, entitlements: [staleTickets, premiumRow!] };
  const after = {
    ...premium,
    entitlements: [staleTickets, { ...premiumRow!, pendingProductId: "duru.tickets.monthly.v1" }],
  };
  rpc.entitlements = [before, before, after];
  await boot();
  await flush();
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PREMIUM");
  tap("header-plan-chip");
  tap("plans-card-unlimited_tickets");
  await act(async () => {
    fireEvent.tap(screen.getByTestId("plans-continue"), {});
  });
  // 상점은 결제 직후가 아니라 서버 권한이 바뀐 뒤 닫힙니다(ADR-0163 D3) — 따라잡기가 끝날 만큼 비웁니다.
  for (let i = 0; i < 12; i += 1) await flush();
  expect(present("coin-shop-screen")).toBe(false);
  act(
    () =>
      void fireEvent.tap(screen.getByTestId("first-unit-guide-map"), { eventType: "catchEvent" }),
  );
  const toast = screen.getByTestId("subscription-toast");
  expect(toast).toHaveTextContent("Unlimited Tickets starts Dec 18");
  expect(toast).toHaveTextContent("You keep Premium until then");
  expect(screen.getByTestId("header-plan-chip")).toHaveTextContent("PREMIUM");
});
