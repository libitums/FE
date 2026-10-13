import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import {
  guestLearnerProfileKey,
  learnerProfileCacheKey,
} from "../lib/learner-profile-cache";
import type {
  LearnerProfileCacheEntry,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import { createLearnerProfileSync, learnerProfileRetryDelaysMs } from "./learner-profile-sync";

// `integration` 계층: 동기화 객체(`createLearnerProfileSync`)가 저장소 · 네트워크 · 타이머와 얽혀 도는 모양을 훅
// 없이 봅니다. 대역은 경계뿐입니다 - `NativeModules.StorageModule` · `fetch` · 가짜 타이머.

const supabaseUrl = "https://test.supabase.co";
const user = "user-1";
const otherUser = "user-2";
const cacheKey = learnerProfileCacheKey(user);

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };
const liam: LearnerProfileRecord = { name: "Liam", countryCode: "FR" };

const tokenFor = (sub: string): string =>
  `e30.${btoa(JSON.stringify({ sub })).replace(/=+$/, "")}.sig`;
const sessionFor = (sub: string): string =>
  serializeAuthSession({
    accessToken: tokenFor(sub),
    refreshToken: `refresh-${sub}`,
    expiresAt: 4_102_444_800_000,
  });

type Reply = { readonly status: number; readonly body: string } | "offline";
type Handler = (body: Record<string, unknown>) => Reply | Promise<Reply>;
type Call = { readonly name: "load_learner_profile" | "save_learner_profile"; readonly body: Record<string, unknown> };

const served = (record: LearnerProfileRecord | null): Reply => ({
  status: 200,
  body: JSON.stringify(record === null ? null : { name: record.name, countryCode: record.countryCode }),
});
const accepted: Reply = { status: 204, body: "" };
const missing: Reply = { status: 404, body: "" };

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

type World = {
  readonly store: Map<string, string>;
  readonly sets: string[];
  readonly calls: Call[];
  readonly handlers: { load: Handler; save: Handler };
  readonly applied: (LearnerProfileCacheEntry | null)[];
  readonly loads: () => Call[];
  readonly saves: () => Call[];
};

function stubWorld(): World {
  const store = new Map<string, string>([[authSessionStorageKey, sessionFor(user)]]);
  const sets: string[] = [];
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => {
        sets.push(key);
        store.set(key, value);
      },
      remove: (key: string) => void store.delete(key),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const calls: Call[] = [];
  const handlers = {
    load: (() => served(null)) as Handler,
    save: (() => accepted) as Handler,
  };
  vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
    const name = (url.split("/rest/v1/rpc/")[1] ?? "") as Call["name"];
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    calls.push({ name, body });
    const handler = name === "load_learner_profile" ? handlers.load : handlers.save;
    return Promise.resolve(handler(body)).then((reply) =>
      reply === "offline"
        ? Promise.reject(new Error("offline"))
        : { status: reply.status, text: async () => reply.body },
    );
  });
  return {
    store,
    sets,
    calls,
    handlers,
    applied: [],
    loads: () => calls.filter((call) => call.name === "load_learner_profile"),
    saves: () => calls.filter((call) => call.name === "save_learner_profile"),
  };
}

const cacheOf = (world: World): unknown => {
  const raw = world.store.get(cacheKey);
  return raw === undefined ? null : (JSON.parse(raw) as unknown);
};
const cacheWrites = (world: World): number =>
  world.sets.filter((key) => key.startsWith("libitum.learner-profile.")).length;
const seedCache = (world: World, record: LearnerProfileRecord, sync: "pending" | "synced"): void =>
  void world.store.set(
    cacheKey,
    JSON.stringify({ v: 1, name: record.name, countryCode: record.countryCode, sync }),
  );
const seedGuest = (world: World, record: LearnerProfileRecord): void =>
  void world.store.set(
    guestLearnerProfileKey,
    JSON.stringify({ v: 1, name: record.name, countryCode: record.countryCode }),
  );
const shapeOf = (record: LearnerProfileRecord, sync: "pending" | "synced") => ({
  v: 1,
  name: record.name,
  countryCode: record.countryCode,
  sync,
});

function startSync(world: World) {
  return createLearnerProfileSync(user, (entry) => void world.applied.push(entry));
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("동기화 객체 - 캐시 · 서버", () => {
  test("Y-1. 캐시도 서버도 없으면 조회 한 번 · 기록 없음 · 저장소에 쓴 키가 없다", async () => {
    const world = stubWorld();

    const sync = startSync(world);
    await sync.flush();

    expect(world.applied).toEqual([null]);
    expect(world.loads()).toHaveLength(1);
    expect(world.saves()).toHaveLength(0);
    expect(cacheWrites(world)).toBe(0);
    sync.dispose();
  });

  test("Y-2. 서버에 값이 있으면 캐시가 synced로 서고 상태에 반영된다", async () => {
    const world = stubWorld();
    world.handlers.load = () => served(emma);

    const sync = startSync(world);
    await sync.flush();

    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    expect(world.applied.at(-1)).toEqual({ record: emma, sync: "synced" });
    sync.dispose();
  });

  test("Y-3. 손님 칸이 있으면 세우는 순간 사용자 칸이 pending이고 손님 칸이 지워지며 flush가 저장 한 번이다", async () => {
    const world = stubWorld();
    seedGuest(world, emma);

    const sync = startSync(world);

    expect(world.calls).toHaveLength(0);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "pending"));
    expect(world.store.has(guestLearnerProfileKey)).toBe(false);
    expect(world.applied).toEqual([{ record: emma, sync: "pending" }]);

    await sync.flush();

    expect(world.saves().map((call) => call.body)).toEqual([
      { p_name: "Emma", p_country_code: "DE" },
    ]);
    expect(world.loads()).toHaveLength(0);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    sync.dispose();
  });

  test("Y-4. 손님 칸에 서버와 다른 값이 있으면 손님 값이 올라가고 캐시 · 상태도 손님 값이다", async () => {
    const world = stubWorld();
    seedGuest(world, emma);
    world.handlers.load = () => served(liam);

    const sync = startSync(world);
    await sync.flush();

    expect(world.saves().map((call) => call.body)).toEqual([
      { p_name: "Emma", p_country_code: "DE" },
    ]);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    expect(world.applied.at(-1)).toEqual({ record: emma, sync: "synced" });
    sync.dispose();
  });

  test("Y-5. save는 요청보다 먼저 캐시에 pending을 쓰고 성공하면 synced로 한 번 더 알린다", async () => {
    const world = stubWorld();
    const gate = deferred<Reply>();
    world.handlers.save = () => gate.promise;
    const sync = startSync(world);
    await sync.flush();
    world.applied.length = 0;

    sync.save(emma);

    expect(cacheOf(world)).toEqual(shapeOf(emma, "pending"));
    expect(world.applied).toEqual([{ record: emma, sync: "pending" }]);
    gate.resolve(accepted);
    await settle();

    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    expect(world.applied).toEqual([
      { record: emma, sync: "pending" },
      { record: emma, sync: "synced" },
    ]);
    sync.dispose();
  });
});

describe("동기화 객체 - 실패와 재시도", () => {
  test("Y-6. 저장이 404여도 캐시는 pending으로 남고 1s · 5s · 15s · 30s · 60s 뒤 다시 시도하다 멈춘다", async () => {
    const world = stubWorld();
    world.handlers.save = () => missing;
    const sync = startSync(world);
    await sync.flush();

    sync.save(emma);
    await settle();
    expect(world.saves()).toHaveLength(1);

    let requests = 1;
    for (const delay of learnerProfileRetryDelaysMs) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(world.saves()).toHaveLength(requests);
      await vi.advanceTimersByTimeAsync(1);
      requests += 1;
      expect(world.saves()).toHaveLength(requests);
    }

    expect(requests).toBe(6);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(world.saves()).toHaveLength(6);
    expect(vi.getTimerCount()).toBe(0);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "pending"));
    sync.dispose();
  });

  test("Y-7. 재시도가 끝난 뒤 flush를 다시 부르면 다시 시도하고 성공하면 synced가 된다", async () => {
    const world = stubWorld();
    world.handlers.save = () => missing;
    const sync = startSync(world);
    await sync.flush();
    sync.save(emma);
    await vi.advanceTimersByTimeAsync(130_000);
    const before = world.saves().length;
    world.handlers.save = () => accepted;

    await sync.flush();

    expect(world.saves()).toHaveLength(before + 1);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    sync.dispose();
  });

  test("Y-8. 응답을 기다리는 동안 다른 값을 save하면 첫 응답이 synced로 만들지 않고 새 값이 한 번 더 올라간다", async () => {
    const world = stubWorld();
    const first = deferred<Reply>();
    let attempt = 0;
    world.handlers.save = () => {
      attempt += 1;
      return attempt === 1 ? first.promise : accepted;
    };
    const sync = startSync(world);
    await sync.flush();

    sync.save(emma);
    await settle();
    sync.save(liam);
    first.resolve(accepted);
    await settle();

    expect(world.saves().map((call) => call.body["p_name"])).toEqual(["Emma", "Liam"]);
    expect(cacheOf(world)).toEqual(shapeOf(liam, "synced"));
    expect(world.applied.at(-1)).toEqual({ record: liam, sync: "synced" });
    expect(world.applied).not.toContainEqual({ record: emma, sync: "synced" });
    sync.dispose();
  });

  test.each([
    ["연결 실패", "offline" as Reply],
    ["서버 오류", { status: 500, body: "" } as Reply],
    ["깨진 응답", { status: 200, body: "not json" } as Reply],
  ])("Y-9. 조회가 %s이면 캐시 · 상태가 그대로이고 재시도 타이머가 없다", async (_label, reply) => {
    const world = stubWorld();
    seedCache(world, emma, "synced");
    world.handlers.load = () => reply;

    const sync = startSync(world);
    await sync.flush();

    expect(world.applied).toEqual([{ record: emma, sync: "synced" }]);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    expect(cacheWrites(world)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    sync.dispose();
  });

  test("Y-10. 캐시가 synced인데 서버에 행이 없으면 pending으로 돌아가 다시 올라간다", async () => {
    const world = stubWorld();
    seedCache(world, emma, "synced");
    world.handlers.load = () => served(null);

    const sync = startSync(world);
    await sync.flush();

    expect(world.saves().map((call) => call.body)).toEqual([
      { p_name: "Emma", p_country_code: "DE" },
    ]);
    expect(world.applied).toEqual([
      { record: emma, sync: "synced" },
      { record: emma, sync: "pending" },
      { record: emma, sync: "synced" },
    ]);
    expect(cacheOf(world)).toEqual(shapeOf(emma, "synced"));
    sync.dispose();
  });

  test("Y-11. 캐시와 서버가 같은 값이면 캐시 쓰기가 없고 상태에 새 값이 알려지지 않는다", async () => {
    const world = stubWorld();
    seedCache(world, emma, "synced");
    world.handlers.load = () => served(emma);

    const sync = startSync(world);
    await sync.flush();

    expect(cacheWrites(world)).toBe(0);
    expect(world.applied).toHaveLength(1);
    sync.dispose();
  });
});

describe("동기화 객체 - 세션 수명", () => {
  test("Y-12. 응답을 기다리는 동안 dispose하면 늦은 응답이 캐시 · 상태를 건드리지 않고 타이머도 남지 않는다", async () => {
    const world = stubWorld();
    const gate = deferred<Reply>();
    world.handlers.load = () => gate.promise;
    const sync = startSync(world);

    const flushing = sync.flush();
    await settle();
    sync.dispose();
    gate.resolve(served(emma));
    await flushing;
    await settle();

    expect(world.applied).toEqual([null]);
    expect(cacheWrites(world)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("Y-12. 응답을 기다리는 동안 세션이 다른 사용자로 바뀌어도 같다", async () => {
    const world = stubWorld();
    const gate = deferred<Reply>();
    world.handlers.load = () => gate.promise;
    const sync = startSync(world);

    const flushing = sync.flush();
    await settle();
    world.store.set(authSessionStorageKey, sessionFor(otherUser));
    gate.resolve(served(emma));
    await flushing;
    await settle();

    expect(world.applied).toEqual([null]);
    expect(cacheWrites(world)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    sync.dispose();
  });

  test("Y-13. flush 둘을 겹쳐 불러도 요청은 한 줄이다", async () => {
    const world = stubWorld();
    const gate = deferred<Reply>();
    world.handlers.load = () => gate.promise;
    const sync = startSync(world);

    const first = sync.flush();
    const second = sync.flush();
    await settle();
    gate.resolve(served(null));
    await Promise.all([first, second]);

    expect(world.loads()).toHaveLength(1);
    sync.dispose();
  });

  test("Y-14. 깨진 캐시 값은 없는 것으로 읽고 조회로 가며 던지지 않는다", async () => {
    const world = stubWorld();
    world.store.set(cacheKey, "{not json");
    world.handlers.load = () => served(liam);

    const sync = startSync(world);
    expect(world.applied).toEqual([null]);
    await sync.flush();

    expect(world.loads()).toHaveLength(1);
    expect(cacheOf(world)).toEqual(shapeOf(liam, "synced"));
    sync.dispose();
  });
});
