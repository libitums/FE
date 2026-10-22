import { afterEach, beforeEach, expect, test } from "vitest";
import { act } from "@lynx-js/react/testing-library";

import { clearAuthSession } from "../lib/auth-session";
import {
  advance,
  boot,
  bootWithoutWaiting,
  cachedKey,
  complete,
  deferred,
  doneCount,
  down,
  env,
  flush,
  keysFor,
  ok,
  pendingKey,
  setUp,
  setsOf,
  snap,
  stored,
  tearDown,
} from "./use-journey-progress.cache.test-support";
import type { Reply } from "./use-journey-progress.cache.test-support";

beforeEach(setUp);
afterEach(tearDown);

function retryFromFailedRow() {
  const row = env.progress.wiring.journeyMapProgressLoad;
  act(() => {
    if (row.status === "failed") row.onRetry();
  });
}

test.each(["{bad", "", JSON.stringify({ version: 2 }), "[]"])(
  "JS10 깨진 저장본(%s)은 없음으로 취급하고 성공 뒤 유효한 저장본으로 덮인다",
  async (raw) => {
    env.store.set(cachedKey("a"), raw);
    const response = deferred();
    env.load = () => response.promise;
    await bootWithoutWaiting();
    expect(env.progress.progressLoadPhase).toBe("checking");
    response.resolve(ok(snap({ catalogProgress: keysFor(1) })));
    await flush();
    expect(doneCount(stored(cachedKey("a")))).toBe(1);
  },
);

test("JS11 미전송만 있으면 즉시 보이고 서버가 null일 때 저장하며 저장본이 생긴다", async () => {
  env.store.set(pendingKey("a"), JSON.stringify(snap({ catalogProgress: keysFor(1) })));
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  expect(env.progress.progressLoadPhase).toBe("hydrated");
  expect(doneCount(env.progress)).toBe(1);
  response.resolve(ok(null));
  await flush();
  expect(env.saves).toHaveLength(1);
  expect(doneCount(stored(cachedKey("a")))).toBe(1);
});

test("JS12 저장본 쓰기가 던져도 동기화는 끝나고 저장 루프가 정상이다", async () => {
  env.failCachedSet = true;
  await boot();
  expect(env.progress.progressLoadPhase).toBe("loaded");
  await complete(1);
  expect(env.saves).toHaveLength(1);
  expect(env.store.has(pendingKey("a"))).toBe(false);
  expect(setsOf(cachedKey("a"))).toHaveLength(0);
});

const failures: [string, Reply | "reject", boolean][] = [
  ["503", down, true],
  ["fetch reject", "reject", true],
  ["bad-json", { status: 200, body: "{bad-json" }, false],
  ["version 2", { status: 200, body: JSON.stringify({ version: 2 }) }, false],
];
function failWith(reply: Reply | "reject") {
  env.load = async () => {
    if (reply === "reject") throw new Error("offline");
    return reply;
  };
}

test.each(failures)("JS13 저장본 없이 조회가 실패하면(%s) failed다", async (_n, reply, auto) => {
  failWith(reply);
  await boot();
  expect(env.progress.progressLoadPhase).toBe("failed");
  expect(env.loads).toBe(1);
  await advance(auto ? 1_000 : 60_000);
  expect(env.loads).toBe(auto ? 2 : 1);
  expect(env.progress.progressLoadPhase).toBe("failed");
});

test.each(failures)(
  "JS14 실패 줄의 다시 시도(%s)는 retrying 뒤 한 번 더 조회한다",
  async (_n, reply) => {
    failWith(reply);
    await boot();
    const before = env.loads;
    expect(env.progress.wiring.journeyMapProgressLoad.status).toBe("failed");
    const response = deferred();
    env.load = () => response.promise;
    retryFromFailedRow();
    await flush();
    expect(env.progress.progressLoadPhase).toBe("retrying");
    expect(env.loads).toBe(before + 1);
    response.resolve(ok(snap({ catalogProgress: keysFor(1) })));
    await flush();
    expect(env.progress.progressLoadPhase).toBe("loaded");
    expect(doneCount(env.progress)).toBe(1);
  },
);

test("JS15 저장본 없이 기다리면 999 ms까지 checking이고 1,000 ms에 loading이다", async () => {
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  await advance(999);
  expect(env.progress.progressLoadPhase).toBe("checking");
  await advance(1);
  expect(env.progress.progressLoadPhase).toBe("loading");
  response.resolve(ok(null));
  await flush();
  expect(env.progress.progressLoadPhase).toBe("loaded");
});

test("JS16 저장본이 있으면 조회가 계속 실패해도 조용하고 학습은 미전송에 쌓인다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ catalogProgress: keysFor(1) })));
  env.load = async () => down;
  await boot();
  await advance(120_000);
  expect(env.progress.progressLoadPhase).toBe("hydrated");
  expect(env.progress.wiring.journeyMapProgressLoad.status).toBe("known");
  await complete(2);
  expect(doneCount(JSON.parse(env.store.get(pendingKey("a"))!))).toBe(2);
});

test("JS17 저장본 적용은 축하 · 설문 · 오늘 기록을 일으키지 않는다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ catalogProgress: keysFor(3) })));
  await boot();
  await advance(1_000);
  expect(doneCount(env.progress)).toBe(3);
  expect(env.progress.streakCelebration).toBe(false);
  expect(env.progress.episodeSurvey).toBeNull();
  expect(env.requests.filter((url) => url.endsWith("record_learning_days"))).toHaveLength(0);
});

test("JS18 조회 중 로그아웃하면 늦은 응답이 저장본을 쓰지 않고 상태도 바꾸지 않는다", async () => {
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  const phase = env.progress.progressLoadPhase;
  clearAuthSession();
  response.resolve(ok(snap({ catalogProgress: keysFor(1) })));
  await flush();
  expect(setsOf(cachedKey("a"))).toHaveLength(0);
  expect(env.store.has(cachedKey("a"))).toBe(false);
  expect(env.progress.progressLoadPhase).toBe(phase);
});

test("JS19 사용자 재시도가 진행 중이면 자동 재시도 타이머가 조회를 겹쳐 내지 않는다", async () => {
  env.load = async () => down;
  await boot();
  await advance(500);
  const before = env.loads;
  env.load = () => deferred().promise;
  retryFromFailedRow();
  await advance(2_000);
  expect(env.loads).toBe(before + 1);
});

test("JS-E1 저장본 없는 사용자의 지연 · 실패 · 회복이 이벤트 셋으로 한 번씩 난다", async () => {
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  await advance(1_000);
  response.resolve(down);
  await flush();
  env.load = async () => ok(null);
  retryFromFailedRow();
  await flush();
  expect(env.events).toEqual([
    { name: "progress_load_delayed" },
    { name: "progress_load_failed", attempt: "first" },
    { name: "progress_load_recovered", trigger: "manual" },
  ]);
});

test("JS-E2 저장본이 있는 사용자는 이벤트를 내지 않는다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ catalogProgress: keysFor(1) })));
  env.load = async () => down;
  await boot();
  await advance(5_000);
  env.load = async () => ok(null);
  await advance(60_000);
  expect(env.progress.progressLoadPhase).toBe("loaded");
  expect(env.events).toEqual([]);
});
