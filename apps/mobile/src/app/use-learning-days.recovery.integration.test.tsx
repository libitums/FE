import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";
import { saveAuthSession, clearAuthSession } from "../lib/auth-session";
import { localDayFrom } from "../lib/progress-api";
import { useJourneyProgress } from "./use-journey-progress";
import { productJourneySeed } from "./journey-progress";
import { createLearningDaySync } from "./learning-day-sync";

const store = new Map<string, string>();
const key = (user: string) => `libitum.learning-days.pending.${user}`;
const requests: { p_days: string[]; p_today: string; owner: string }[] = [];
let progress: ReturnType<typeof useJourneyProgress>;
let response: () => Promise<{ status: number; body: string }>;
function signIn(user: string) {
  saveAuthSession({
    accessToken: `e30.${btoa(JSON.stringify({ sub: user })).replace(/=+$/, "")}.sig`,
    refreshToken: user,
    expiresAt: 4_102_444_800_000,
  });
}
function Harness() {
  progress = useJourneyProgress(productJourneySeed, []);
  return null;
}
async function boot() {
  render(<Harness />);
  await act(async () => {
    await progress.syncFromServer();
  });
}
async function complete(count: number) {
  act(() => progress.setCompletedStepCount(count));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 25, 12));
  store.clear();
  requests.length = 0;
  response = async () => ({ status: 503, body: "" });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, value: string) => void store.set(k, value),
      remove: (k: string) => void store.delete(k),
    },
  });
  vi.stubGlobal(
    "fetch",
    async (url: string, init: { body: string; headers: Record<string, string> }) => {
      let reply = { status: 200, body: "0" };
      if (url.endsWith("load_learning_progress")) reply.body = "null";
      if (url.endsWith("save_learning_progress")) reply = { status: 204, body: "" };
      if (url.endsWith("record_learning_days")) {
        requests.push({ ...JSON.parse(init.body), owner: init.headers["Authorization"] });
        reply = await response();
      }
      return { status: reply.status, text: async () => reply.body };
    },
  );
  signIn("a");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("오프라인 날짜를 재시작 후 원래 날짜로 보내고 현재 날짜의 연속만 표시한다", async () => {
  await boot();
  await complete(1);
  expect(JSON.parse(store.get(key("a"))!)).toEqual(["2026-09-25"]);
  cleanup();
  vi.setSystemTime(new Date(2026, 9, 1, 12));
  response = async () => ({ status: 200, body: "0" });
  await boot();
  expect(requests.at(-1)).toMatchObject({ p_days: ["2026-09-25"], p_today: "2026-10-01" });
  expect(store.has(key("a"))).toBe(false);
  expect(progress.streakDays).toBe(0);
  expect(progress.streakCelebration).toBe(false);
});

test("통신이 복구되면 추가 학습 없이 재전송하고 서버 응답 뒤에만 지운다", async () => {
  await boot();
  await complete(1);
  expect(requests).toHaveLength(1);
  response = async () => ({ status: 200, body: "1" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
  expect(requests).toHaveLength(2);
  expect(store.has(key("a"))).toBe(false);
  expect(progress.streakDays).toBe(1);
  expect(progress.streakCelebration).toBe(true);
});

test("같은 날 활동을 여러 번 해도 대기 날짜를 중복 저장하지 않는다", async () => {
  await boot();
  await complete(1);
  await complete(2);
  expect(JSON.parse(store.get(key("a"))!)).toEqual([localDayFrom(new Date())]);
});

test("대기 중 다음 날짜가 추가돼도 이전 응답으로 지우지 않는다", async () => {
  let resolve!: (value: { status: number; body: string }) => void;
  response = () =>
    new Promise((done) => {
      resolve = done;
    });
  await boot();
  await complete(1);
  vi.setSystemTime(new Date(2026, 8, 26, 12));
  await complete(2);
  expect(requests).toHaveLength(1);
  response = async () => ({ status: 503, body: "" });
  await act(async () => {
    resolve({ status: 200, body: "1" });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(JSON.parse(store.get(key("a"))!)).toEqual(["2026-09-26"]);
  expect(requests.at(-1)).toMatchObject({ p_days: ["2026-09-26"], p_today: "2026-09-26" });
});

test("로그아웃 뒤 늦게 도착한 성공은 대기 날짜를 지우지 않는다", async () => {
  let resolve!: (value: { status: number; body: string }) => void;
  response = () =>
    new Promise((done) => {
      resolve = done;
    });
  await boot();
  await complete(1);
  clearAuthSession();
  await act(async () => {
    resolve({ status: 200, body: "1" });
  });
  expect(store.has(key("a"))).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(requests).toHaveLength(1);
  expect(progress.streakDays).toBe(0);
});

test("다른 계정은 이전 계정 날짜를 전송하지 않고 원래 계정에서 복구한다", async () => {
  await boot();
  await complete(1);
  signIn("b");
  await act(async () => {
    await progress.syncFromServer();
  });
  expect(requests).toHaveLength(1);
  expect(store.has(key("a"))).toBe(true);
  signIn("a");
  response = async () => ({ status: 200, body: "1" });
  await act(async () => {
    await progress.syncFromServer();
  });
  expect(requests).toHaveLength(2);
  expect(requests[1]?.owner).toContain(btoa(JSON.stringify({ sub: "a" })).replace(/=+$/, ""));
  expect(store.has(key("a"))).toBe(false);
});

test("서버에 새 RPC가 없으면 확인되지 않은 날짜를 보관한다", async () => {
  response = async () => ({ status: 404, body: "" });
  store.set(key("a"), JSON.stringify(["2026-09-20"]));
  await boot();
  expect(JSON.parse(store.get(key("a"))!)).toEqual(["2026-09-20"]);
  expect(progress.streakDays).toBe(0);
});

test("64일 넘는 대기 날짜는 나눠 보내고 모두 확인된 뒤 비운다", async () => {
  const days = Array.from({ length: 70 }, (_, i) => {
    const date = new Date(2026, 6, 1 + i, 12);
    return localDayFrom(date);
  });
  store.set(key("a"), JSON.stringify(days));
  response = async () => ({ status: 200, body: "0" });
  await boot();
  expect(requests.map((r) => r.p_days.length)).toEqual([64, 6]);
  expect(requests.flatMap((r) => r.p_days)).toEqual(days);
  expect(store.has(key("a"))).toBe(false);
});

test("손상된 항목과 중복은 제외하고 유효한 날짜만 복구한다", async () => {
  store.set(key("a"), JSON.stringify(["2026-09-20", null, "2026-02-30", "wrong", "2026-09-20"]));
  response = async () => ({ status: 200, body: "0" });
  await boot();
  expect(requests[0].p_days).toEqual(["2026-09-20"]);
  expect(store.has(key("a"))).toBe(false);
});

test("연결 복구 직후 새 날짜가 생기면 이전 실패 대기 시간을 이어받지 않는다", async () => {
  const days = createLearningDaySync("a", () => {
    vi.setSystemTime(new Date(2026, 8, 26, 12));
    response = async () => ({ status: 503, body: "" });
    void days.record("2026-09-26");
  });
  try {
    await days.record("2026-09-25");
    await vi.advanceTimersByTimeAsync(1_000);
    response = async () => ({ status: 200, body: "1" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(requests).toHaveLength(3);
    expect(JSON.parse(store.get(key("a"))!)).toEqual(["2026-09-26"]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(requests).toHaveLength(4);
  } finally {
    days.dispose();
  }
});
