import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedRecord } from "./test-helpers/progress-seed";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { ticketRefillMs } from "../lib/learning-tickets";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";

// 학습 티켓을 App 한 트리에서 봅니다 — 머리 칩 · 말풍선 태그 · 새 레슨의 문지기 · 티켓 없음 대화상자 · 「Get more
// tickets」 · 진행 저장(서버 · 기기 미전송). 대역은 경계뿐입니다 — `StorageModule` · `fetch` · 이벤트 sink.

type Reply = { status: number; body: string };
const ok = (body: unknown): Reply => ({ status: 200, body: JSON.stringify(body) });
const down: Reply = { status: 503, body: "" };
const user = "u";

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
  sub: user,
  app_metadata: { provider: "google", providers: ["google"] },
})}.sig`;

const u01 = "u01-water";

/** 옛 튜토리얼을 마친 진행에 u01 표지와 완료한 유닛 키를 더합니다. */
const progressOf = (done: readonly string[]) =>
  learningProgressSnapshotFrom({
    legacyTutorial: legacyPassedRecord,
    catalogProgress: { [u01]: ["intro", ...done] },
  });

const env = {
  store: new Map<string, string>(),
  saves: [] as Record<string, unknown>[],
  events: [] as EpisodeIntroEvent[],
  load: async (): Promise<Reply> => ok(null),
};

async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function boot(load: () => Promise<Reply>, seed: Record<string, string> = {}): Promise<void> {
  env.store = new Map(Object.entries(seed));
  env.store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  env.store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  env.saves = [];
  env.events = [];
  env.load = load;
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => env.store.get(key) ?? null,
      set: (key: string, value: string) => void env.store.set(key, value),
      remove: (key: string) => void env.store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    if (url.includes("grant_type=refresh_token")) {
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            access_token: accessToken,
            refresh_token: "refreshed",
            expires_in: 3600,
            token_type: "bearer",
            user: { id: user },
          }),
      };
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    const body = init?.body === undefined ? {} : (JSON.parse(init.body) as Record<string, unknown>);
    if (name === "save_learning_progress") env.saves.push(body);
    const reply: Reply =
      name === "load_learning_progress"
        ? await env.load()
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

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const chip = () => screen.getByTestId("top-bar-tickets");

/** 스텝을 시작하고(말풍선 Start) 레슨이 열렸으면 나가기 확인으로 맵에 돌아옵니다. */
function startStep(id: string): boolean {
  tap(catalogNodeTestId(u01, id));
  tap("step-sheet-start");
  const opened = screen.queryByTestId("learning-shell") !== null;
  if (opened) {
    tap("learning-run-header-exit");
    fireEvent.tap(
      within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
      {},
    );
  }
  return opened;
}

test("[IT1] 새 레슨은 티켓 1장 — 칩 3 → 2, 말풍선에 태그, 서버 저장에 원장이 실린다", async () => {
  await boot(async () => ok(progressOf([])));
  expect(chip()).toHaveTextContent("3");
  tap(catalogNodeTestId(u01, "S1"));
  expect(screen.getByTestId("step-sheet-ticket-cost")).toBeInTheDocument();
  tap("step-sheet-start");
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  tap("learning-run-header-exit");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  expect(chip()).toHaveTextContent("2");
  const saved = env.saves.at(-1)?.["p_progress"] as { tickets?: unknown } | undefined;
  expect(saved?.tickets).toMatchObject({ grantedMs: 0, grantDay: "" });
});

test("[IT2] 끝낸 레슨 다시 하기는 무료 — 태그 없음, 칩 그대로", async () => {
  await boot(async () => ok(progressOf(["S1"])));
  tap(catalogNodeTestId(u01, "S1"));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  tap("learning-run-header-exit");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  expect(chip()).toHaveTextContent("3");
});

test("[IT3] 0장에서 새 레슨은 열리지 않고 대화상자 · tickets_ran_out 한 번, Back to map이 닫는다", async () => {
  await boot(async () => ok(progressOf([])));
  for (let i = 0; i < 3; i += 1) expect(startStep("S1")).toBe(true);
  await flush();
  expect(chip()).toHaveTextContent("0");
  expect(startStep("S1")).toBe(false);
  expect(screen.getByTestId("out-of-tickets")).toBeInTheDocument();
  expect(screen.getByTestId("out-of-tickets-clock")).toHaveTextContent("1:00");
  expect(env.events.filter((e) => e.name === "tickets_ran_out")).toHaveLength(1);
  tap("out-of-tickets-back");
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell")).not.toBeInTheDocument();
});

test("[IT4] 대화상자에서 Get more → 오늘 1장, Start lesson이 막혔던 레슨을 연다", async () => {
  await boot(async () => ok(progressOf([])));
  for (let i = 0; i < 3; i += 1) startStep("S1");
  startStep("S1");
  tap("out-of-tickets-more");
  expect(env.events.filter((e) => e.name === "ticket_more_tapped")).toEqual([
    { name: "ticket_more_tapped", surface: "out_of_tickets", granted: true },
  ]);
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent("free ticket");
  tap("out-of-tickets-start");
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IT5] 칩 → 모달: 가득이면 Get more가 채우지 않고 안내만, 시간이 지나면 칸이 다시 찬다", async () => {
  await boot(async () => ok(progressOf([])));
  tap("top-bar-tickets");
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("3");
  tap("ticket-modal-more");
  expect(screen.getByTestId("ticket-modal-more-notice")).toHaveTextContent(
    "More ways to get tickets are coming soon.",
  );
  expect(env.events.filter((e) => e.name === "ticket_more_tapped")).toEqual([
    { name: "ticket_more_tapped", surface: "ticket_modal", granted: false },
  ]);
  fireEvent.tap(
    within(screen.getByTestId("ticket-modal-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  startStep("S1");
  await flush();
  tap("top-bar-tickets");
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("2");
  expect(screen.getByTestId("ticket-modal-next")).toHaveTextContent("Next ticket in 1:00:00");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ticketRefillMs);
  });
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("3");
  expect(screen.queryByTestId("ticket-modal-next")).not.toBeInTheDocument();
});

test("[IT6] 오프라인(서버 실패)에서도 기기 저장본으로 쓰고, 원장은 기기 미전송 저장본에 남는다", async () => {
  await boot(async () => down, {
    [`libitum.progress.cached.${user}`]: JSON.stringify(progressOf([])),
  });
  expect(chip()).toHaveTextContent("3");
  expect(startStep("S1")).toBe(true);
  await flush();
  expect(chip()).toHaveTextContent("2");
  expect(env.saves).toHaveLength(0);
  const pending = JSON.parse(env.store.get(`libitum.progress.pending.${user}`) ?? "null") as {
    tickets?: unknown;
  } | null;
  expect(pending?.tickets).toMatchObject({ grantedMs: 0, grantDay: "" });
});
