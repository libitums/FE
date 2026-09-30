import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { entrySplashDurationMs } from "../lib/entry-flow";
import { localDayFrom } from "../lib/progress-api";

// 「서버 진행 불러오기 · 합치기 → 활동 완료 → 오늘 기록 · 진행 저장 → 연속 칩」을 한 트리에서 봅니다(IPG1~IPG3,
// ADR-0035). 대역은 경계뿐입니다 — `StorageModule` · `fetch`(Supabase 갱신 · 학습 RPC).

type Rpc = { readonly name: string; readonly body: Record<string, unknown> };
type Replies = {
  load: { status: number; body: string };
  streak: number;
  recorded: number;
};

const refreshedBody = JSON.stringify({
  access_token: `e30.${btoa(JSON.stringify({ sub: "u" })).replace(/=+$/, "")}.sig`,
  refresh_token: "refreshed-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "u" },
});

async function boot(replies: Replies): Promise<Rpc[]> {
  const store = new Map<string, string>();
  store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const rpcs: Rpc[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedBody });
    }
    const name = url.split("/rest/v1/rpc/")[1] ?? url;
    rpcs.push({ name, body: JSON.parse(init.body) as Record<string, unknown> });
    const reply =
      name === "load_learning_progress"
        ? replies.load
        : name === "learning_streak"
          ? { status: 200, body: String(replies.streak) }
          : name === "record_learning_days"
            ? { status: 200, body: String(replies.recorded) }
            : { status: 204, body: "" };
    return Promise.resolve({ status: reply.status, text: async () => reply.body });
  });

  vi.useFakeTimers();
  render(<App />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  await flush();
  return rpcs;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const introUnit = () => screen.getByTestId("ui-lynx-learning-unit-tutorial-intro");
const tapButtonIn = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

/** 표지를 건너뛰고 결과 화면의 Check로 맵에 돌아옵니다 — 표지 완료 = 활동 하나. */
function finishIntro(): void {
  fireEvent.tap(introUnit(), {});
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
  tapButtonIn("lesson-complete-screen-exit");
}

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("[IPG1] 부팅 뒤 서버 진행을 불러와 맵에 그리고, 연속 칩이 서버의 일수다", async () => {
  const snapshot = {
    version: 1,
    completedStepCount: 2,
    completedEpisodeIntroIds: ["tutorial-intro"],
    completedMessengerUnitIds: [],
    completedPhoneCallUnitIds: [],
    visualNovel: { status: "active", beatIndex: 0 },
    completedEpisodeFinalIds: [],
  };
  const rpcs = await boot({
    load: { status: 200, body: JSON.stringify(snapshot) },
    streak: 5,
    recorded: 5,
  });

  expect(introUnit()).toHaveAttribute("data-status", "clear");
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "5-day streak",
  );
  expect(rpcs.map((rpc) => rpc.name)).toEqual(["load_learning_progress", "learning_streak"]);
  // 부팅으로 받은 일수는 축하하지 않습니다 — 모달이 저절로 뜨지 않습니다.
  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
  expect(rpcs[1]!.body).toEqual({ p_today: localDayFrom(new Date()) });
});

test("[IPG2] 활동을 끝내면 오늘을 적고 진행을 저장하며, 연속 칩이 새 일수로 바뀐다", async () => {
  const rpcs = await boot({ load: { status: 200, body: "null" }, streak: 0, recorded: 1 });
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );

  finishIntro();
  await flush();

  const record = rpcs.find((rpc) => rpc.name === "record_learning_days");
  expect(record?.body).toEqual({
    p_days: [localDayFrom(new Date())],
    p_today: localDayFrom(new Date()),
  });
  const save = rpcs.find((rpc) => rpc.name === "save_learning_progress");
  expect((save?.body["p_progress"] as Record<string, unknown>)["completedEpisodeIntroIds"]).toEqual(
    ["tutorial-intro"],
  );
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "1-day streak",
  );
  // 연속이 늘어 맵으로 돌아오면 연속 학습 모달이 한 번 뜹니다.
  expect(screen.getByTestId("journey-stat-modal-streak")).toBeInTheDocument();
  expect(screen.getByTestId("journey-stat-modal-value")).toHaveTextContent("1");
});

test("[IPG4] 이미 오늘 한 날(일수가 그대로)이면 모달이 뜨지 않는다", async () => {
  await boot({ load: { status: 200, body: "null" }, streak: 3, recorded: 3 });

  finishIntro();
  await flush();

  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "3-day streak",
  );
  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
});

test("[IPG3] 불러오기가 실패했으면 저장하지 않고 다시 불러온다 — 서버 진행을 덮어쓰지 않는다", async () => {
  const rpcs = await boot({ load: { status: 500, body: "" }, streak: 0, recorded: 1 });

  finishIntro();
  await flush();

  expect(rpcs.some((rpc) => rpc.name === "save_learning_progress")).toBe(false);
  expect(rpcs.filter((rpc) => rpc.name === "load_learning_progress")).toHaveLength(2);
  expect(rpcs.some((rpc) => rpc.name === "record_learning_days")).toBe(true);
});
