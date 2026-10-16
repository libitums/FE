import { afterEach, beforeEach, expect, test } from "vitest";
import { act } from "@lynx-js/react/testing-library";

import {
  advance,
  boot,
  bootWithoutWaiting,
  cachedKey,
  complete,
  deferred,
  down,
  empty,
  env,
  flush,
  ok,
  pendingKey,
  setUp,
  setsOf,
  signIn,
  snap,
  stored,
  tearDown,
} from "./use-journey-progress.cache.test-support";

beforeEach(setUp);
afterEach(tearDown);

const withIntro = { completedEpisodeIntroIds: ["tutorial-intro"] };

test("JS1 저장본이 있으면 서버 응답 전에 진행이 적용되고 아직 불러온 것이 아니다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ completedStepCount: 2, ...withIntro })));
  env.load = () => deferred().promise;
  await bootWithoutWaiting();
  expect(env.progress.completedStepCount).toBe(2);
  expect(env.progress.completedEpisodeIntroIds).toEqual(["tutorial-intro"]);
  expect(env.progress.progressLoadPhase).toBe("hydrated");
  expect(env.progress.hasLoadedProgress).toBe(false);
});

test("JS2 서버 응답이 더 적어도 진행이 줄지 않고 서버 것이 더해진다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ completedStepCount: 2, ...withIntro })));
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  response.resolve(
    ok(snap({ completedStepCount: 1, completedMessengerUnitIds: ["appointment-confirmation"] })),
  );
  await flush();
  expect(env.progress.completedStepCount).toBe(2);
  expect(env.progress.completedEpisodeIntroIds).toEqual(["tutorial-intro"]);
  expect(env.progress.completedMessengerUnitIds).toEqual(["appointment-confirmation"]);
  expect(env.progress.progressLoadPhase).toBe("loaded");
  expect(env.progress.hasLoadedProgress).toBe(true);
});

test("JS3 저장본과 서버가 같으면 저장 RPC도 저장본 쓰기도 없다", async () => {
  const same = snap({ completedStepCount: 1, ...withIntro });
  env.store.set(cachedKey("a"), JSON.stringify(same));
  env.load = async () => ok(same);
  await boot();
  expect(env.saves).toHaveLength(0);
  expect(env.store.has(cachedKey("a"))).toBe(true);
  expect(env.store.has(pendingKey("a"))).toBe(false);
  expect(setsOf(cachedKey("a"))).toHaveLength(0);
});

test("JS4 순서만 다른 서버 응답에는 저장 RPC가 나가지 않는다", async () => {
  env.store.set(
    cachedKey("a"),
    JSON.stringify(snap({ catalogProgress: { u01: ["intro", "S1"] } })),
  );
  env.load = async () => ok(snap({ catalogProgress: { u01: ["S1", "intro"] } }));
  await boot();
  expect(env.saves).toHaveLength(0);
  expect(env.store.has(pendingKey("a"))).toBe(false);
  expect(env.progress.progressLoadPhase).toBe("loaded");
});

test("JS5 저장본 없고 서버가 null이면 응답 뒤 빈 저장본이 생긴다", async () => {
  const response = deferred();
  env.load = () => response.promise;
  await bootWithoutWaiting();
  expect(env.progress.progressLoadPhase).toBe("checking");
  expect(env.store.has(cachedKey("a"))).toBe(false);
  response.resolve(ok(null));
  await flush();
  expect(stored(cachedKey("a"))).toEqual(empty);
  expect(env.progress.progressLoadPhase).toBe("loaded");
});

test("JS6 진행 하나를 저장하면 저장본을 쓴 다음에 미전송을 지운다", async () => {
  await boot();
  env.ops.length = 0;
  await complete(1);
  expect(stored(cachedKey("a"))?.completedStepCount).toBe(1);
  expect(env.store.has(pendingKey("a"))).toBe(false);
  const written = env.ops.indexOf(`set ${cachedKey("a")}`);
  const cleared = env.ops.indexOf(`remove ${pendingKey("a")}`);
  expect(written).toBeGreaterThanOrEqual(0);
  expect(cleared).toBeGreaterThan(written);
});

test("JS7 저장이 실패하면 저장본은 이전 값 그대로고 미전송이 남는다", async () => {
  await boot();
  env.save = async () => down;
  await complete(1);
  expect(stored(cachedKey("a"))?.completedStepCount).toBe(0);
  expect(env.store.has(pendingKey("a"))).toBe(true);
});

test("JS8 저장 응답을 기다리는 중 새 진행이 있으면 첫 성공이 저장본을 쓰지 않는다", async () => {
  await boot();
  const first = deferred();
  const second = deferred();
  env.save = () => (env.saves.length === 1 ? first.promise : second.promise);
  await complete(1);
  await complete(2);
  first.resolve({ status: 204, body: "" });
  await flush();
  expect(stored(cachedKey("a"))?.completedStepCount).toBe(0);
  second.resolve({ status: 204, body: "" });
  await flush();
  expect(stored(cachedKey("a"))?.completedStepCount).toBe(2);
  expect(env.store.has(pendingKey("a"))).toBe(false);
});

test("JS9 계정을 바꾸면 다른 사용자의 저장본을 적용하지 않고 자기 키에만 쓴다", async () => {
  env.store.set(cachedKey("a"), JSON.stringify(snap({ completedStepCount: 3 })));
  await boot();
  expect(env.progress.completedStepCount).toBe(3);
  const aBefore = env.store.get(cachedKey("a"));
  signIn("b");
  const response = deferred();
  env.load = () => response.promise;
  act(() => {
    void env.progress.syncFromServer();
  });
  await flush();
  expect(env.progress.completedStepCount).toBe(0);
  expect(env.progress.progressLoadPhase).toBe("checking");
  expect(env.ops).toContain(`get ${cachedKey("b")}`);
  response.resolve(ok(snap({ completedStepCount: 1 })));
  await flush();
  expect(stored(cachedKey("b"))?.completedStepCount).toBe(1);
  expect(env.store.get(cachedKey("a"))).toBe(aBefore);
  expect(stored(cachedKey("a"))?.completedStepCount).toBe(3);
});

test("JS9b 앞 계정의 지연 타이머가 새 계정의 확인 중을 앞당기지 않는다", async () => {
  env.load = () => deferred().promise;
  await bootWithoutWaiting();
  await advance(500);
  signIn("b");
  act(() => {
    void env.progress.syncFromServer();
  });
  await flush();
  expect(env.progress.progressLoadPhase).toBe("checking");
  await advance(500);
  expect(env.progress.progressLoadPhase).toBe("checking");
  await advance(500);
  expect(env.progress.progressLoadPhase).toBe("loading");
});
