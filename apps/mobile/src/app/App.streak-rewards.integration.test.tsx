import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { localDayFrom } from "../lib/progress-api";
import { streakRewardTestIds as ids } from "../screens/journey-map/streak-reward.contract";

// `integration` 계층(SR-I1 ~ I3): 연속 학습 엽전 보상(ADR-0143) — 서버의 연속 7일 → 🔥 칩 → 보상 카드 · Collect → 서버 지급 →
// 엽전 날기 → 모달 닫힘 → 머리 엽전 칩 = 서버 잔액, 이벤트 한 번. 대역은 경계뿐 — 지급 RPC 모듈(`streak-reward-api`) ·
// 엽전 출시 지급 모듈 · `StorageModule` · `fetch`(갱신 · 학습 RPC).

const claims = vi.hoisted(() => ({
  result: { days: 7, amount: 40, granted: true, balance: 40 } as {
    days: number;
    amount: number;
    granted: boolean;
    balance: number;
  } | null,
  calls: [] as string[],
}));
vi.mock("../lib/streak-reward-api", () => ({
  streakRewardClient: () => ({
    claim: async (today: string) => {
      claims.calls.push(today);
      return claims.result;
    },
  }),
}));
vi.mock("../lib/coin-wallet-api", () => ({
  coinClient: () => ({ claim: async () => null }),
}));

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "streak-user" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "streak-user" },
});

let events: EpisodeIntroEvent[] = [];

async function boot(streak: number): Promise<void> {
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
    const body =
      name === "load_learning_progress" ? "null" : name === "learning_streak" ? String(streak) : "";
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
const coins = () => screen.getByTestId("top-bar-coins").textContent;
const present = (testId: string) => screen.queryByTestId(testId) !== null;
const openStreak = () => act(() => void fireEvent.tap(screen.getByTestId("top-bar-streak"), {}));
async function collect(): Promise<void> {
  vi.useFakeTimers();
  act(() => {
    fireEvent.tap(within(screen.getByTestId(ids.collect)).getByTestId("ui-lynx-button"), {});
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  vi.useRealTimers();
  await flush();
}

beforeEach(() => {
  claims.result = { days: 7, amount: 40, granted: true, balance: 40 };
  claims.calls = [];
  events = [];
});
afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("SR-I1 연속 7일: 🔥 칩 → 카드 · Collect → 서버 지급 → 날아간 뒤 닫히고 엽전 칩이 서버 잔액, 이벤트 한 번", async () => {
  await boot(7);
  expect(coins()).toContain("0");
  openStreak();
  expect(screen.getByTestId(ids.card)).toHaveTextContent("+40");
  await collect();
  expect(claims.calls).toEqual([localDayFrom(new Date())]);
  expect(present("journey-stat-modal-streak")).toBe(false);
  expect(coins()).toContain("40");
  const collected = events.filter((e) => e.name === "streak_reward_collected");
  expect(collected).toHaveLength(1);
  expect(collected[0]).toMatchObject({ surface: "learning", days: "7", amount: "40" });
});

test("SR-I2 받은 뒤 다시 열면 오늘 칸이 초록 꼬리표이고 Continue — 지급을 다시 부르지 않는다", async () => {
  await boot(7);
  openStreak();
  await collect();
  openStreak();
  expect(present(ids.card)).toBe(false);
  expect(present("journey-stat-modal-continue")).toBe(true);
  expect(screen.getByTestId(ids.tag(6))).toHaveAttribute("data-kind", "earned");
  expect(claims.calls).toHaveLength(1);
});

test("SR-I3 지급이 실패하면 막지 않고 닫히며 칩은 그대로다", async () => {
  claims.result = null;
  await boot(7);
  openStreak();
  await collect();
  expect(present("journey-stat-modal-streak")).toBe(false);
  expect(coins()).toContain("0");
  expect(events.some((e) => e.name === "streak_reward_collected")).toBe(false);
});

test("SR-I4 이정표가 아닌 날(5일)은 목표 줄 · 남은 날 문구 · Continue", async () => {
  await boot(5);
  openStreak();
  expect(screen.getByTestId(ids.goal)).toHaveTextContent("14-day goal");
  expect(screen.getByTestId("journey-stat-modal-message")).toHaveTextContent("2 more days");
  expect(present(ids.collect)).toBe(false);
});
