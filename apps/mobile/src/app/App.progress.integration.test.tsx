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

const introUnit = () => screen.getByTestId("ui-lynx-special-unit-catalog-cover-u00-tutorial");
const tapButtonIn = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

/** u00 표지를 건너뛰어 맵에 돌아옵니다 — 표지 완료 = 활동 하나. */
function finishIntro(): void {
  fireEvent.tap(introUnit(), {});
  tapButtonIn("episode-intro-screen-skip");
  tapButtonIn("ui-lynx-dialog-action-skip");
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
    completedStepCount: 0,
    completedEpisodeIntroIds: [],
    completedMessengerUnitIds: [],
    completedPhoneCallUnitIds: [],
    visualNovel: { status: "active", beatIndex: 0 },
    completedEpisodeFinalIds: [],
    catalogProgress: { "u00-tutorial": ["intro"] },
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
  // 이 파일의 갱신 토큰은 `sub`를 든 JWT 모양이라 프로필 동기화도 돌아 `load_learner_profile`이 낍니다 -
  // 진행 RPC 둘만 걸러 견줍니다(프로필 조회는 이 파일의 대역이 모르는 RPC라 204로 답받습니다).
  const progressRpcs = rpcs.filter((rpc) => !rpc.name.endsWith("_learner_profile"));
  expect(progressRpcs.map((rpc) => rpc.name)).toEqual([
    "load_learning_progress",
    "learning_streak",
  ]);
  // 부팅으로 받은 일수는 축하하지 않습니다 — 모달이 저절로 뜨지 않습니다.
  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
  expect(progressRpcs[1]!.body).toEqual({ p_today: localDayFrom(new Date()) });
});

test("[IPG2] 표지만 끝내면 진행은 저장하지만 오늘을 적지 않고, 연속 칩 · 모달이 그대로다 (ADR-0035 U2 개정 2026-11-09)", async () => {
  const rpcs = await boot({ load: { status: 200, body: "null" }, streak: 0, recorded: 1 });
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );

  finishIntro();
  await flush();

  const save = rpcs.find((rpc) => rpc.name === "save_learning_progress");
  expect((save?.body["p_progress"] as Record<string, unknown>)["catalogProgress"]).toEqual({
    "u00-tutorial": ["intro"],
  });
  // 표지는 연속 학습의 하루가 아니다 — 일반 학습(레슨 · 문화 · 최종 테스트)을 끝내야 적는다(레슨 쪽은 App.catalog-lessons L-ST1).
  expect(rpcs.some((rpc) => rpc.name === "record_learning_days")).toBe(false);
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );
  expect(screen.queryByTestId("journey-stat-modal-streak")).toBeNull();
});

test("[IPG3] 불러오기가 실패했으면 저장하지 않고 다시 불러온다 — 서버 진행을 덮어쓰지 않는다", async () => {
  const rpcs = await boot({ load: { status: 500, body: "" }, streak: 0, recorded: 1 });

  finishIntro();
  await flush();

  expect(rpcs.some((rpc) => rpc.name === "save_learning_progress")).toBe(false);
  expect(rpcs.filter((rpc) => rpc.name === "load_learning_progress")).toHaveLength(2);
  // 표지는 연속 학습의 하루가 아니어서 날짜도 적지 않는다(ADR-0035 U2 개정 2026-11-09).
  expect(rpcs.some((rpc) => rpc.name === "record_learning_days")).toBe(false);
});
