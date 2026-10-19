import { expect, test } from "vitest";

import { createSyncRunner } from "./content-sync-runner";

// `unit` 계층: 받기 실행기 — 겹치지 않고, 도는 중에 온 요청은 끝난 뒤 한 번으로 모읍니다.

function deferredTask() {
  let runs = 0;
  const releases: (() => void)[] = [];
  const task = () =>
    new Promise<void>((resolve) => {
      runs += 1;
      releases.push(resolve);
    });
  return { task, runs: () => runs, release: () => releases.shift()?.() };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("SR1. 요청 하나에 한 번 돈다", async () => {
  const d = deferredTask();
  const runner = createSyncRunner(d.task);

  const done = runner.request();
  expect(d.runs()).toBe(1);
  d.release();
  await done;
  expect(d.runs()).toBe(1);
});

test("SR2. 도는 중에 온 요청 여럿은 끝난 뒤 정확히 한 번 더 돈다", async () => {
  const d = deferredTask();
  const runner = createSyncRunner(d.task);

  void runner.request();
  void runner.request();
  void runner.request();
  expect(d.runs()).toBe(1);

  d.release();
  await flush();
  expect(d.runs()).toBe(2);
  d.release();
  await flush();
  expect(d.runs()).toBe(2);
});

test("SR3. 일이 던져도 실행기는 다음 요청을 받는다", async () => {
  let runs = 0;
  const runner = createSyncRunner(async () => {
    runs += 1;
    throw new Error("boom");
  });

  await runner.request();
  await runner.request();
  expect(runs).toBe(2);
});
