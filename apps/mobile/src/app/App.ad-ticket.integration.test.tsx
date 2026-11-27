import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { statChipDropDurationMs } from "../components/StatChip";
import { App } from "./App";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { setTicketDropWaitForTests } from "./use-learning-tickets";
import { resetAdTicketFlagForTests } from "../lib/ad-ticket-flag";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fullTicketLedger, spendTicket } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { legacyPassedRecord } from "./test-helpers/progress-seed";

// 광고 보고 티켓 1장(ADR-0209)을 App 한 트리에서 봅니다 — 「Out of tickets」 광고 줄 · 서버 시작(요청 id) · 호스트 광고 ·
// 지급 확인(SSV가 늦으면 다시 읽음) · 원장에 1장 · 이벤트. 대역은 경계뿐 — `fetch`(Supabase · PostHog) · `NativeModules`.

type Reply = { status: number; body: string };
const ok = (body: unknown): Reply => ({ status: 200, body: JSON.stringify(body) });
const user = "00000000-0000-4000-8000-0000000000a1";
const u01 = "u01-water";

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: user,
  app_metadata: { provider: "google", providers: ["google"] },
})}.sig`;

const drainedProgress = () => {
  const now = Date.now();
  const tickets = [0, 1, 2].reduce<TicketLedger>(
    (ledger) => spendTicket(ledger, now) ?? ledger,
    fullTicketLedger,
  );
  return learningProgressSnapshotFrom({
    legacyTutorial: legacyPassedRecord,
    catalogProgress: { [u01]: ["intro"] },
    tickets,
  });
};

const status = (left: number, request: unknown = null) =>
  ok({ enabled: true, eligible: true, reason: null, cap: 2, used: 2 - left, left, request });

const env = {
  store: new Map<string, string>(),
  events: [] as EpisodeIntroEvent[],
  calls: [] as { name: string; body: Record<string, unknown> }[],
  /** 상태 응답 차례 — 다 쓰면 마지막 것을 되풀이합니다. */
  statuses: [] as Reply[],
  flag: { enabled: true, variant: "test" } as unknown,
  load: "loaded" as string,
  show: "earned" as string,
  shown: [] as string[][],
  audioStops: 0,
};

async function flush(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function boot(withModule = true): Promise<void> {
  env.store = new Map([
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    [
      authSessionStorageKey,
      serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
    ],
  ]);
  env.events = [];
  env.calls = [];
  env.shown = [];
  env.audioStops = 0;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => env.store.get(key) ?? null,
      set: (key: string, value: string) => void env.store.set(key, value),
      remove: (key: string) => void env.store.delete(key),
    },
    AudioPlaybackModule: {
      play: () => undefined,
      stop: () => {
        env.audioStops += 1;
      },
    },
    ...(withModule
      ? {
          RewardedAdModule: {
            loadRewarded: (callback: (payload: unknown) => void) =>
              setTimeout(() => callback({ status: env.load }), 300),
            showRewarded: (userId: string, customData: string, callback: (p: unknown) => void) => {
              env.shown.push([userId, customData]);
              setTimeout(() => callback({ status: env.show }), 1_000);
            },
          },
        }
      : {}),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubEnv("PUBLIC_POSTHOG_KEY", "phc_test");
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    const body = init?.body === undefined ? {} : (JSON.parse(init.body) as Record<string, unknown>);
    if (url.includes("posthog.com/flags/")) {
      env.calls.push({ name: "flags", body });
      return {
        status: 200,
        text: async () => JSON.stringify({ flags: { "ad-ticket": env.flag } }),
      };
    }
    if (url.includes("posthog.com"))
      return { status: 200, text: async () => "{}", json: async () => ({}) };
    if (url.includes("grant_type=refresh_token")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            access_token: accessToken,
            refresh_token: "refreshed",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: user, created_at: "2026-01-01T00:00:00Z" },
          }),
      };
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    if (name.startsWith("ad_ticket")) env.calls.push({ name, body });
    const reply: Reply =
      name === "load_learning_progress"
        ? ok(drainedProgress())
        : name === "ad_ticket_status"
          ? ((env.statuses.length > 1 ? env.statuses.shift() : env.statuses[0]) ?? status(2))
          : name === "ad_ticket_start"
            ? ok({
                result: "ok",
                requestId: "11111111-1111-4111-8111-111111111111",
                left: 2,
                cap: 2,
              })
            : name === "learning_streak" || name === "record_learning_days"
              ? { status: 200, body: "0" }
              : { status: 204, body: "" };
    return { status: reply.status, text: async () => reply.body };
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2027, 0, 15, 9, 0, 0));
  render(<App episodeIntroEventSink={(event) => env.events.push(event)} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await flush();
  await flush();
}

beforeEach(() => {
  setTicketDropWaitForTests(true);
  env.statuses = [status(2)];
  env.flag = { enabled: true, variant: "test" };
  env.load = "loaded";
  env.show = "earned";
});

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  resetAdTicketFlagForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const adEvents = () => env.events.filter((event) => event.name.startsWith("ad_ticket"));
const lastOf = <T,>(list: readonly T[]): T | undefined => list[list.length - 1];

/** S1의 Start를 눌러 티켓 없음 대화상자를 띄우고, 광고 줄의 상태 · 플래그 읽기를 기다립니다. */
async function openOutOfTickets(): Promise<void> {
  tap(catalogNodeTestId(u01, "S1"));
  tap("step-sheet-start");
  await flush();
  await flush();
}

test("[IAT1] 실험군 · 대상 — 광고 줄 → 시작(요청 id) → 광고(사용자 id · 요청 id) → 지급 확인 → 1장 · You got a ticket → 레슨", async () => {
  await boot();
  env.statuses = [
    status(2),
    status(2, { id: "r", status: "pending", reason: null }),
    status(1, { id: "r", status: "granted", reason: null }),
  ];
  await openOutOfTickets();
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("+1 ticket · 2 left today");
  expect(env.calls.find((c) => c.name === "flags")?.body).toEqual({
    api_key: "phc_test",
    distinct_id: user,
  });
  tap("out-of-tickets-ad");
  await flush();
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("Loading ad…");
  await flush(300);
  expect(env.shown).toEqual([[user, "11111111-1111-4111-8111-111111111111"]]);
  expect(env.audioStops).toBeGreaterThanOrEqual(1);
  await flush(1_000);
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("Getting your ticket…");
  await flush(1_000);
  await flush(1_500);
  expect(screen.getByTestId("out-of-tickets")).toHaveTextContent("You got a ticket");
  expect(screen.getByTestId("out-of-tickets-ad-granted")).toHaveTextContent(
    "Thanks for watching. 1 ad ticket left today.",
  );
  expect(screen.getByTestId("top-bar-tickets")).toHaveTextContent("1");
  const start = env.calls.find((c) => c.name === "ad_ticket_start");
  expect(typeof start?.body["p_utc_offset_min"]).toBe("number");
  expect(lastOf(env.calls.filter((c) => c.name === "ad_ticket_status"))?.body["p_request_id"]).toBe(
    "11111111-1111-4111-8111-111111111111",
  );
  expect(adEvents()).toEqual([
    { name: "ad_ticket_offer_shown", arm: "test", left: "2" },
    { name: "ad_ticket_started" },
    { name: "ad_ticket_completed" },
    { name: "ad_ticket_granted", left: "1" },
  ]);
  tap("out-of-tickets-start");
  act(() => {
    vi.advanceTimersByTime(statChipDropDurationMs.standard);
  });
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IAT2] 대조군 — 광고 줄 없음, 노출 이벤트(control)만, 시작하지 않는다", async () => {
  await boot();
  env.flag = { enabled: true, variant: "control" };
  await openOutOfTickets();
  expect(screen.getByTestId("out-of-tickets")).toBeInTheDocument();
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  expect(adEvents()).toEqual([{ name: "ad_ticket_offer_shown", arm: "control", left: "2" }]);
  expect(env.calls.some((c) => c.name === "ad_ticket_start")).toBe(false);
});

test("[IAT3] 호스트 광고 모듈이 없으면(값 파일 없음) 서버 · 플래그를 묻지 않고 줄도 없다", async () => {
  await boot(false);
  await openOutOfTickets();
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  expect(env.calls).toEqual([]);
  expect(adEvents()).toEqual([]);
});

test("[IAT4] 서버 스위치 off · 대상 아님이면 줄 없음 · 노출 이벤트 없음", async () => {
  await boot();
  env.statuses = [
    ok({ enabled: false, eligible: false, reason: "off", cap: 2, left: 2, request: null }),
  ];
  await openOutOfTickets();
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  expect(adEvents()).toEqual([]);
});

test("[IAT5] 광고 없음 → A5 안내(티켓 그대로), 1분 뒤 줄이 다시 선다", async () => {
  await boot();
  env.load = "no_fill";
  await openOutOfTickets();
  tap("out-of-tickets-ad");
  await flush();
  await flush(300);
  expect(screen.getByTestId("out-of-tickets-ad-notice")).toHaveTextContent(
    "No ad is available right now. Try again in a little while.",
  );
  expect(env.shown).toEqual([]);
  expect(screen.getByTestId("top-bar-tickets")).toHaveTextContent("0");
  expect(lastOf(adEvents())).toEqual({ name: "ad_ticket_failed", reason: "no_fill" });
  await flush(60_000);
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("Watch a short ad");
});

test("[IAT6] 광고를 일찍 닫으면 지급 확인을 하지 않고 줄이 다시 선다", async () => {
  await boot();
  env.show = "dismissed";
  await openOutOfTickets();
  tap("out-of-tickets-ad");
  await flush();
  await flush(300);
  await flush(1_000);
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("Watch a short ad");
  expect(lastOf(adEvents())).toEqual({ name: "ad_ticket_failed", reason: "closed_early" });
  expect(env.calls.filter((c) => c.name === "ad_ticket_status")).toHaveLength(1);
});

test("[IAT7] Back to map으로 닫으면 진행 중인 확인을 버린다 — 다시 열면 상태를 새로 읽는다", async () => {
  await boot();
  env.statuses = [status(2), status(2, { id: "r", status: "pending", reason: null })];
  await openOutOfTickets();
  tap("out-of-tickets-ad");
  await flush();
  await flush(300);
  await flush(1_000);
  tap("out-of-tickets-back");
  await flush(30_000);
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  const before = env.calls.filter((c) => c.name === "ad_ticket_status").length;
  await openOutOfTickets();
  expect(env.calls.filter((c) => c.name === "ad_ticket_status").length).toBe(before + 1);
  expect(
    within(screen.getByTestId("out-of-tickets")).queryByTestId("out-of-tickets-ad-granted"),
  ).not.toBeInTheDocument();
});
