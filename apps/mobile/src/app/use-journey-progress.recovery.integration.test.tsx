import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { saveAuthSession, clearAuthSession } from "../lib/auth-session";
import { useJourneyProgress } from "./use-journey-progress";
import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";

type Reply = { status: number; body: string };
const empty = learningProgressSnapshotFrom({ ...productJourneySeed, completedEpisodeIntroIds: [] });
const pendingKey = (user: string) => `libitum.progress.pending.${user}`;
const store = new Map<string, string>();
const saves: { owner: string; snapshot: typeof empty }[] = [];
let progress: ReturnType<typeof useJourneyProgress>;
let load: () => Promise<Reply>;
let save: () => Promise<Reply>;
let loads = 0;

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
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};
async function boot() {
  render(<Harness />);
  await act(async () => {
    await progress.syncFromServer();
  });
}
async function complete(count: number) {
  act(() => progress.setCompletedStepCount(count));
  await flush();
}
function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  store.clear();
  saves.length = 0;
  loads = 0;
  load = async () => ({ status: 200, body: "null" });
  save = async () => ({ status: 204, body: "" });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubGlobal(
    "fetch",
    async (url: string, init: { body: string; headers: Record<string, string> }) => {
      let reply: Reply = { status: 200, body: "0" };
      if (url.endsWith("load_learning_progress")) {
        loads++;
        reply = await load();
      }
      if (url.endsWith("save_learning_progress")) {
        saves.push({
          owner: init.headers["Authorization"]!,
          snapshot: JSON.parse(init.body).p_progress as typeof empty,
        });
        reply = await save();
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

test("저장 실패 후 재시작해도 진행을 복구하고 성공한 뒤에만 대기 기록을 지운다", async () => {
  save = async () => ({ status: 503, body: "" });
  await boot();
  await complete(1);
  expect(JSON.parse(store.get(pendingKey("a"))!).completedStepCount).toBe(1);
  cleanup();
  const response = deferred();
  save = () => response.promise;
  await bootWithoutWaiting();
  expect(progress.completedStepCount).toBe(1);
  expect(store.has(pendingKey("a"))).toBe(true);
  response.resolve({ status: 204, body: "" });
  await flush();
  expect(saves.map((call) => call.snapshot.completedStepCount)).toEqual([1, 1]);
  expect(store.has(pendingKey("a"))).toBe(false);
});

async function bootWithoutWaiting() {
  render(<Harness />);
  act(() => {
    void progress.syncFromServer();
  });
  await flush();
}

test("초기 불러오기 실패 중 학습한 뒤 빈 서버 응답으로 복구돼도 추가 학습 없이 저장한다", async () => {
  load = async () => ({ status: 503, body: "" });
  await boot();
  await complete(2);
  expect(saves).toHaveLength(0);
  load = async () => ({ status: 200, body: "null" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(saves.map((call) => call.snapshot.completedStepCount)).toEqual([2]);
  expect(store.has(pendingKey("a"))).toBe(false);
});

test("저장 응답 대기 중 새 진행을 보관하며 이전 성공 응답이 새 기록을 지우지 않는다", async () => {
  await boot();
  const first = deferred();
  const second = deferred();
  save = () => (saves.length === 1 ? first.promise : second.promise);
  await complete(1);
  await complete(2);
  expect(saves).toHaveLength(1);
  expect(JSON.parse(store.get(pendingKey("a"))!).completedStepCount).toBe(2);
  first.resolve({ status: 204, body: "" });
  await flush();
  expect(saves.map((call) => call.snapshot.completedStepCount)).toEqual([1, 2]);
  expect(store.has(pendingKey("a"))).toBe(true);
  second.resolve({ status: 204, body: "" });
  await flush();
  expect(store.has(pendingKey("a"))).toBe(false);
});

test("저장 실패는 자동 재시도하고 성공 뒤 타이머를 멈춘다", async () => {
  await boot();
  save = async () => ({ status: 503, body: "" });
  await complete(1);
  save = async () => ({ status: 204, body: "" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(saves).toHaveLength(2);
  const requests = loads;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(loads).toBe(requests);
  expect(saves).toHaveLength(2);
});

test("로그아웃 뒤 늦게 온 성공 응답은 미전송 기록을 지우지 않고 재시도도 멈춘다", async () => {
  await boot();
  const response = deferred();
  save = () => response.promise;
  await complete(1);
  clearAuthSession();
  cleanup();
  response.resolve({ status: 204, body: "" });
  await flush();
  expect(store.has(pendingKey("a"))).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(saves).toHaveLength(1);
});

test("같은 앱에서 다른 계정으로 로그인해도 이전 진행을 섞지 않는다", async () => {
  save = async () => ({ status: 503, body: "" });
  await boot();
  await complete(3);
  signIn("b");
  save = async () => ({ status: 204, body: "" });
  await act(async () => {
    await progress.syncFromServer();
  });
  expect(progress.completedStepCount).toBe(0);
  expect(saves).toHaveLength(1);
  await complete(1);
  expect(saves[1]!.snapshot.completedStepCount).toBe(1);
  expect(saves[1]!.owner).not.toBe(saves[0]!.owner);
  expect(store.has(pendingKey("a"))).toBe(true);
  signIn("a");
  await act(async () => {
    await progress.syncFromServer();
  });
  expect(progress.completedStepCount).toBe(3);
  expect(store.has(pendingKey("a"))).toBe(false);
});

test("계정 전환 뒤 이전 서버 응답을 적용하거나 새 계정으로 보내지 않는다", async () => {
  const response = deferred();
  load = () => response.promise;
  await bootWithoutWaiting();
  signIn("b");
  load = async () => ({ status: 200, body: "null" });
  await act(async () => {
    await progress.syncFromServer();
  });
  response.resolve({ status: 200, body: JSON.stringify({ ...empty, completedStepCount: 8 }) });
  await flush();
  expect(progress.completedStepCount).toBe(0);
  expect(saves).toHaveLength(0);
});

test.each(["{bad-json", "", JSON.stringify({ version: 2 })])(
  "유효하지 않은 서버 응답(%s)을 빈 진행으로 취급하지 않는다",
  async (body) => {
    store.set(pendingKey("a"), JSON.stringify({ ...empty, completedStepCount: 1 }));
    load = async () => ({ status: 200, body });
    await boot();
    expect(progress.completedStepCount).toBe(1);
    expect(saves).toHaveLength(0);
    expect(store.has(pendingKey("a"))).toBe(true);
  },
);

test.each(["{bad-json", "", JSON.stringify({ version: 2 })])(
  "유효하지 않은 서버 응답(%s)을 자동으로 반복 조회하지 않고 명시적 동기화로 복구한다",
  async (body) => {
    store.set(pendingKey("a"), JSON.stringify({ ...empty, completedStepCount: 1 }));
    load = async () => ({ status: 200, body });
    await boot();
    expect(loads).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(loads).toBe(1);
    expect(saves).toHaveLength(0);
    expect(store.has(pendingKey("a"))).toBe(true);
    load = async () => ({ status: 200, body: "null" });
    await act(async () => {
      await progress.syncFromServer();
    });
    expect(loads).toBe(2);
    expect(saves.map((call) => call.snapshot.completedStepCount)).toEqual([1]);
    expect(store.has(pendingKey("a"))).toBe(false);
  },
);

test("재시작 시 서버 진행과 미전송 진행을 합쳐 저장한다", async () => {
  store.set(
    pendingKey("a"),
    JSON.stringify({ ...empty, completedEpisodeIntroIds: ["tutorial-intro"] }),
  );
  load = async () => ({ status: 200, body: JSON.stringify({ ...empty, completedStepCount: 3 }) });
  await boot();
  expect(progress.completedEpisodeIntroIds).toEqual(["tutorial-intro"]);
  expect(progress.completedStepCount).toBe(3);
  expect(saves[0]!.snapshot).toMatchObject({
    completedStepCount: 3,
    completedEpisodeIntroIds: ["tutorial-intro"],
  });
});

test("오래 오프라인이어도 재시도 간격을 늘리며 언마운트 후에는 요청하지 않는다", async () => {
  load = async () => ({ status: 503, body: "" });
  await boot();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(loads).toBeGreaterThan(1);
  expect(loads).toBeLessThan(10);
  cleanup();
  const count = loads;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(loads).toBe(count);
});

test("학습 중 불러오기 응답이 늦어도 그동안 진행한 내용과 합친다", async () => {
  const response = deferred();
  load = () => response.promise;
  await bootWithoutWaiting();
  await complete(2);
  expect(JSON.parse(store.get(pendingKey("a"))!).completedStepCount).toBe(2);
  response.resolve({
    status: 200,
    body: JSON.stringify({ ...empty, completedEpisodeIntroIds: ["tutorial-intro"] }),
  });
  await flush();
  expect(saves[0]!.snapshot).toMatchObject({
    completedStepCount: 2,
    completedEpisodeIntroIds: ["tutorial-intro"],
  });
});

test("응답만 유실돼 서버에 이미 반영된 진행은 재조회 확인 후 대기열에서 지운다", async () => {
  await boot();
  save = async () => ({ status: 503, body: "" });
  await complete(2);
  load = async () => ({ status: 200, body: JSON.stringify({ ...empty, completedStepCount: 2 }) });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(saves).toHaveLength(1);
  expect(store.has(pendingKey("a"))).toBe(false);
});

test("망 연결 거부·타임아웃에서도 미전송 기록을 유지하고 복구한다", async () => {
  await boot();
  save = async () => {
    throw new Error("offline");
  };
  await complete(2);
  expect(store.has(pendingKey("a"))).toBe(true);
  const response = deferred();
  save = () => response.promise;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(11_000);
  });
  expect(store.has(pendingKey("a"))).toBe(true);
  save = async () => ({ status: 204, body: "" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(store.has(pendingKey("a"))).toBe(false);
  response.resolve({ status: 503, body: "" });
  await flush();
});

test("초기 조회 실패에서 복구되면 다음 저장 실패는 첫 재시도 간격부터 시작한다", async () => {
  load = async () => ({ status: 503, body: "" });
  await boot();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(21_000);
  });
  expect(loads).toBe(4);
  load = async () => ({ status: 200, body: "null" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(loads).toBe(5);
  save = async () => ({ status: 503, body: "" });
  await complete(1);
  expect(saves).toHaveLength(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(999);
  });
  expect(saves).toHaveLength(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(saves).toHaveLength(2);
});

test("재조회가 성공해도 저장이 계속 실패하면 재시도 간격을 늘린다", async () => {
  await boot();
  save = async () => ({ status: 503, body: "" });
  await complete(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
  expect(saves).toHaveLength(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4_999);
  });
  expect(saves).toHaveLength(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(saves).toHaveLength(3);
});
