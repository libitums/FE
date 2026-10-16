// 진행 저장본 훅 수준 통합 테스트의 공용 도구입니다 - 가짜 저장소(연산 기록) · RPC 대역 · 측정 sink.
import { vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { saveAuthSession } from "../lib/auth-session";
import type { ProgressLoadEvent } from "../lib/progress-load-event.contract";
import { productJourneySeed } from "./journey-progress";
import { learningProgressSnapshotFrom } from "./learning-progress";
import { useJourneyProgress } from "./use-journey-progress";
import { useProgressLoadEvents } from "./use-progress-load-events";

export type Reply = { status: number; body: string };
export const empty = learningProgressSnapshotFrom({
  ...productJourneySeed,
  completedEpisodeIntroIds: [],
  catalogProgress: {},
});
export type Snapshot = typeof empty;
export const snap = (override: Record<string, unknown> = {}): Snapshot =>
  ({ ...empty, ...override }) as Snapshot;
export const cachedKey = (user: string) => `libitum.progress.cached.${user}`;
export const pendingKey = (user: string) => `libitum.progress.pending.${user}`;
export const ok = (body: unknown): Reply => ({ status: 200, body: JSON.stringify(body) });
export const down: Reply = { status: 503, body: "" };

/** 시나리오가 바꾸는 상태입니다. 모듈 한 벌 - 파일마다 격리됩니다. */
export const env = {
  store: new Map<string, string>(),
  ops: [] as string[],
  saves: [] as { owner: string; snapshot: Snapshot }[],
  requests: [] as string[],
  events: [] as ProgressLoadEvent[],
  loads: 0,
  load: (async () => ok(null)) as () => Promise<Reply>,
  save: (async () => ({ status: 204, body: "" })) as () => Promise<Reply>,
  failCachedSet: false,
  progress: undefined as unknown as ReturnType<typeof useJourneyProgress>,
};

export function signIn(user: string) {
  saveAuthSession({
    accessToken: `e30.${btoa(JSON.stringify({ sub: user })).replace(/=+$/, "")}.sig`,
    refreshToken: user,
    expiresAt: 4_102_444_800_000,
  });
}
function Harness() {
  env.progress = useJourneyProgress(productJourneySeed, [], () => ["RP"]);
  useProgressLoadEvents(env.progress.progressLoadPhase, (event) => env.events.push(event));
  return null;
}
export const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};
export const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
/** 동기화를 시작하되 조회 응답을 기다리지 않습니다. */
export async function bootWithoutWaiting() {
  render(<Harness />);
  act(() => {
    void env.progress.syncFromServer();
  });
  await flush();
}
export async function boot() {
  render(<Harness />);
  await act(async () => {
    await env.progress.syncFromServer();
  });
}
export async function complete(count: number) {
  act(() => env.progress.setCompletedStepCount(count));
  await flush();
}
export function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
export const stored = (key: string): Snapshot | undefined => {
  const raw = env.store.get(key);
  return raw === undefined ? undefined : (JSON.parse(raw) as Snapshot);
};
export const setsOf = (key: string) => env.ops.filter((op) => op === `set ${key}`);

export function setUp() {
  vi.useFakeTimers();
  env.store.clear();
  env.ops.length = 0;
  env.saves.length = 0;
  env.requests.length = 0;
  env.events.length = 0;
  env.loads = 0;
  env.failCachedSet = false;
  env.load = async () => ok(null);
  env.save = async () => ({ status: 204, body: "" });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => {
        env.ops.push(`get ${key}`);
        return env.store.get(key) ?? null;
      },
      set: (key: string, value: string) => {
        if (env.failCachedSet && key.startsWith("libitum.progress.cached.")) {
          throw new Error("storage full");
        }
        env.ops.push(`set ${key}`);
        env.store.set(key, value);
      },
      remove: (key: string) => {
        env.ops.push(`remove ${key}`);
        env.store.delete(key);
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    async (url: string, init: { body: string; headers: Record<string, string> }) => {
      env.requests.push(url);
      let reply: Reply = { status: 200, body: "0" };
      if (url.endsWith("load_learning_progress")) {
        env.loads++;
        reply = await env.load();
      }
      if (url.endsWith("save_learning_progress")) {
        env.saves.push({
          owner: init.headers["Authorization"]!,
          snapshot: JSON.parse(init.body).p_progress as Snapshot,
        });
        reply = await env.save();
      }
      return { status: reply.status, text: async () => reply.body };
    },
  );
  signIn("a");
}
export function tearDown() {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}
