import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { statChipDropDurationMs } from "../components/StatChip";
import { App } from "./App";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { emptyLegacyTutorialRecord } from "./legacy-tutorial-progress";
import { resetPushWiringForTests } from "./push-wiring";
import { setTicketDropWaitForTests } from "./use-learning-tickets";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { fullTicketLedger, spendTicket, ticketRefillMs } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { welcomePassStorageKey } from "../lib/welcome-pass";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { legacyPassedRecord, tutorialCoverDoneProgress } from "./test-helpers/progress-seed";

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

/** 지금 세 장을 모두 쓴 원장을 실은 진행입니다 — 티켓으로 연 유닛은 다시 열어도 쓰지 않으므로 0장은 원장으로 만듭니다. */
const drainedProgressOf = (done: readonly string[]) => {
  const now = Date.now();
  const tickets = [0, 1, 2].reduce<TicketLedger>(
    (ledger) => spendTicket(ledger, now) ?? ledger,
    fullTicketLedger,
  );
  return learningProgressSnapshotFrom({
    legacyTutorial: legacyPassedRecord,
    catalogProgress: { [u01]: ["intro", ...done] },
    tickets,
  });
};

const env = {
  store: new Map<string, string>(),
  saves: [] as Record<string, unknown>[],
  events: [] as EpisodeIntroEvent[],
  load: async (): Promise<Reply> => ok(null),
  /** 엽전으로 1장 사기(RPC `companion_buy_ticket`)의 답 · 받은 요청 본문입니다. */
  buy: async (): Promise<Reply> => ok({ result: "bought", price: 20, wallet: { balance: 80 } }),
  buys: [] as Record<string, unknown>[],
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
  env.buys = [];
  env.buy = async () => ok({ result: "bought", price: 20, wallet: { balance: 80 } });
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
    if (name === "companion_buy_ticket") env.buys.push(body);
    const reply: Reply =
      name === "load_learning_progress"
        ? await env.load()
        : name === "companion_buy_ticket"
          ? await env.buy()
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

// 이 파일은 앱 그대로 — 머리 칩이 줄어드는 것을 보인 뒤 학습을 엽니다(시안 E4).
beforeEach(() => {
  setTicketDropWaitForTests(true);
});

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});
const chip = () => screen.getByTestId("top-bar-tickets");
/** 새 레슨 Start 뒤 칩의 줄어듦을 끝까지 돌려 학습을 엽니다. 다시 하기는 이미 열려 있어 아무 일도 없습니다. */
const finishTicketDrop = () =>
  act(() => {
    vi.advanceTimersByTime(statChipDropDurationMs.standard);
  });

/** 스텝을 시작하고(말풍선 Start) 레슨이 열렸으면 나가기 확인으로 맵에 돌아옵니다. */
function startStep(id: string): boolean {
  tap(catalogNodeTestId(u01, id));
  tap("step-sheet-start");
  finishTicketDrop();
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
  finishTicketDrop();
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
  await boot(async () => ok(drainedProgressOf([])));
  expect(chip()).toHaveTextContent("0");
  expect(startStep("S1")).toBe(false);
  expect(screen.getByTestId("out-of-tickets")).toBeInTheDocument();
  expect(screen.getByTestId("out-of-tickets-clock")).toHaveTextContent("1:00");
  expect(env.events.filter((e) => e.name === "tickets_ran_out")).toHaveLength(1);
  tap("out-of-tickets-back");
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell")).not.toBeInTheDocument();
});

test("[IT4] 대화상자에서 Get 1 ticket → 엽전 20으로 1장(서버 요청 id), Start lesson이 막혔던 레슨을 연다", async () => {
  await boot(async () => ok(drainedProgressOf([])));
  startStep("S1");
  tap("out-of-tickets-more");
  await flush();
  expect(env.buys).toHaveLength(1);
  expect(String(env.buys[0]?.["p_request_id"])).toMatch(/^[0-9a-f-]{36}$/);
  expect(env.events.filter((e) => e.name === "ticket_more_tapped")).toEqual([
    { name: "ticket_more_tapped", surface: "out_of_tickets", result: "bought", price: "20" },
  ]);
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent("1 ticket added.");
  tap("out-of-tickets-start");
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  finishTicketDrop();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IT5] 칩 → 모달: 가득이면 Get 1 ticket이 서버를 부르지 않고 안내만, 시간이 지나면 칸이 다시 찬다", async () => {
  await boot(async () => ok(progressOf([])));
  tap("top-bar-tickets");
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("3");
  tap("ticket-modal-more");
  await flush();
  expect(screen.getByTestId("ticket-modal-more-notice")).toHaveTextContent(
    "Your tickets are already full.",
  );
  expect(env.buys).toEqual([]);
  expect(env.events.filter((e) => e.name === "ticket_more_tapped")).toEqual([
    { name: "ticket_more_tapped", surface: "ticket_modal", result: "full", price: "20" },
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

test("[IT7] 새 레슨 Start → 칩이 3 → 2로 줄며 −1이 떨어지고, 재생이 끝난 뒤 학습이 열린다(시안 E4)", async () => {
  await boot(async () => ok(progressOf([])));
  tap(catalogNodeTestId(u01, "S1"));
  tap("step-sheet-start");

  expect(screen.queryByTestId("learning-shell")).not.toBeInTheDocument();
  expect(screen.getByTestId("top-bar-tickets-drop")).toHaveTextContent("32");
  expect(screen.getByTestId("top-bar-tickets-minus")).toHaveTextContent("−1");
  expect(chip()).toHaveAttribute("accessibility-label", "2 tickets left");

  act(() => {
    vi.advanceTimersByTime(statChipDropDurationMs.standard);
  });
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IT8] 재생을 기다리는 동안 Start를 또 눌러도 한 장만 쓰고 한 번만 연다", async () => {
  await boot(async () => ok(progressOf([])));
  tap(catalogNodeTestId(u01, "S1"));
  tap("step-sheet-start");
  tap("step-sheet-start");
  tap("step-sheet-start");
  act(() => {
    vi.advanceTimersByTime(statChipDropDurationMs.standard * 3);
  });
  expect(screen.getAllByTestId("learning-shell")).toHaveLength(1);
  tap("learning-run-header-exit");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  expect(chip()).toHaveTextContent("2");
});

test("[IT9] 다시 하기는 줄어듦 없이 바로 연다", async () => {
  await boot(async () => ok(progressOf(["S1"])));
  tap(catalogNodeTestId(u01, "S1"));
  tap("step-sheet-start");
  expect(screen.queryByTestId("top-bar-tickets-drop")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IT10] u00 튜토리얼 레슨 Start는 티켓을 쓰지 않아 칩이 줄지 않고 바로 연다(ADR-0081)", async () => {
  await boot(async () =>
    ok(
      learningProgressSnapshotFrom({
        legacyTutorial: emptyLegacyTutorialRecord,
        catalogProgress: tutorialCoverDoneProgress(),
      }),
    ),
  );
  expect(chip()).toHaveTextContent("3");
  tap(catalogNodeTestId(TUTORIAL_EPISODE_ID, "S1"));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  tap("step-sheet-start");
  expect(screen.queryByTestId("top-bar-tickets-drop")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});

test("[IT11] 티켓으로 연 레슨을 나갔다 다시 열면 또 쓰지 않는다 — 칩 2 그대로, 진한 색 노드, 저장에 실린다", async () => {
  await boot(async () => ok(progressOf([])));
  expect(startStep("S1")).toBe(true);
  await flush();
  expect(chip()).toHaveTextContent("2");
  expect(screen.getByTestId(catalogNodeTestId(u01, "S1"))).toHaveAttribute("data-status", "active");

  tap(catalogNodeTestId(u01, "S1"));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  expect(startStep("S1")).toBe(true);
  await flush();
  expect(chip()).toHaveTextContent("2");
  const saved = env.saves.at(-1)?.["p_progress"] as { ticketUnits?: unknown } | undefined;
  expect(saved?.ticketUnits).toEqual({ [u01]: ["S1"] });
});

// 엽전으로 1장 사기(사용자 결정 2026-11-23) — 모자람 · 서버 실패는 원장을 그대로 두고 안내만, 사는 중의 연타는 한 번만 보냅니다.
test("[IT12] 엽전이 모자라면 칩 그대로 · 모자란 수 안내 · Start lesson 없음", async () => {
  await boot(async () => ok(drainedProgressOf([])));
  env.buy = async () => ok({ result: "short", price: 20, shortBy: 8, wallet: { balance: 12 } });
  startStep("S1");
  tap("out-of-tickets-more");
  await flush();
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent(
    "Not enough coins. You need 8 more.",
  );
  expect(screen.queryByTestId("out-of-tickets-start")).not.toBeInTheDocument();
  expect(chip()).toHaveTextContent("0");
  expect(env.events.filter((e) => e.name === "ticket_more_tapped")).toEqual([
    { name: "ticket_more_tapped", surface: "out_of_tickets", result: "short", price: "20" },
  ]);
});

test("[IT13] 서버가 실패하면 안내만, 다시 누르면 새 요청 id로 다시 산다", async () => {
  await boot(async () => ok(drainedProgressOf([])));
  env.buy = async () => down;
  startStep("S1");
  tap("out-of-tickets-more");
  await flush();
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent(
    "Couldn't get a ticket. Please try again.",
  );
  env.buy = async () => ok({ result: "bought", price: 20, wallet: { balance: 80 } });
  tap("out-of-tickets-more");
  await flush();
  expect(env.buys).toHaveLength(2);
  expect(env.buys[0]?.["p_request_id"]).not.toBe(env.buys[1]?.["p_request_id"]);
  expect(screen.getByTestId("out-of-tickets-start")).toBeInTheDocument();
});

test("[IT14] 사는 중에 또 눌러도 서버에는 한 번만 보낸다", async () => {
  await boot(async () => ok(drainedProgressOf([])));
  let answer: (reply: Reply) => void = () => {};
  env.buy = () =>
    new Promise<Reply>((resolve) => {
      answer = resolve;
    });
  startStep("S1");
  tap("out-of-tickets-more");
  await flush();
  tap("out-of-tickets-more");
  await flush();
  expect(env.buys).toHaveLength(1);
  answer(ok({ result: "bought", price: 20, wallet: { balance: 80 } }));
  await flush();
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent("1 ticket added.");
});

// 첫날 무제한 티켓(ADR-0186) — 시작 시각은 진입점이 적습니다(여기서는 저장소에 심음). 무대의 지금은 2027-01-15 09:00.
const welcomeSeed = (hoursAgo: number) => ({
  [welcomePassStorageKey]: String(new Date(2027, 0, 15, 9).getTime() - hoursAgo * ticketRefillMs),
});

test("[IT15] 첫 실행 뒤 24시간 안이면 0장이어도 새 레슨이 열린다 — 태그 · 대화상자 · tickets_ran_out 없음, 칩은 남은 시간 판", async () => {
  await boot(async () => ok(drainedProgressOf([])), welcomeSeed(1));
  tap(catalogNodeTestId(u01, "S1"));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
  expect(screen.queryByTestId("out-of-tickets")).not.toBeInTheDocument();
  expect(env.events.filter((e) => e.name === "tickets_ran_out")).toHaveLength(0);
  tap("learning-run-header-exit");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  tap("top-bar-tickets");
  expect(screen.getByTestId("unlimited-ticket-modal-days-left")).toHaveTextContent("23 hours left");
});

test("[IT16] 24시간이 지난 기기는 지금 규칙 그대로 — 0장이면 대화상자", async () => {
  await boot(async () => ok(drainedProgressOf([])), welcomeSeed(25));
  expect(chip()).toHaveTextContent("0");
  expect(startStep("S1")).toBe(false);
  expect(screen.getByTestId("out-of-tickets")).toBeInTheDocument();
});

test("[IT17] 앱을 켜 둔 채 24시간이 끝나면 칩이 숫자로 돌아오고 레슨이 다시 티켓을 쓴다", async () => {
  await boot(async () => ok(progressOf([])), welcomeSeed(23.5));
  tap(catalogNodeTestId(u01, "S1"));
  expect(screen.queryByTestId("step-sheet-ticket-cost")).not.toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ticketRefillMs);
  });
  expect(chip()).toHaveTextContent("3");
  expect(screen.getByTestId("step-sheet-ticket-cost")).toBeInTheDocument();
});
