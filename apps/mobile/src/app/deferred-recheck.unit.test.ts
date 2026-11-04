import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createDeferredRecheck } from "./deferred-recheck";

// `unit` 계층: 건너뛴 편 재확인 타이머(ADR-0095 D5) — 하나만 돌고, 요금 없는 연결이 되면 한 번 알리고 멈춥니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test("DR1. 건너뛴 편이 있으면 간격마다 보고, 요금 없는 연결이 되면 한 번 알리고 멈춘다", () => {
  let unmetered = false;
  const onUnmetered = vi.fn();
  const recheck = createDeferredRecheck({
    intervalMs: 1000,
    isUnmetered: () => unmetered,
    onUnmetered,
  });
  recheck.update(true);
  vi.advanceTimersByTime(3000);
  expect(onUnmetered).not.toHaveBeenCalled();
  unmetered = true;
  vi.advanceTimersByTime(1000);
  expect(onUnmetered).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(10_000);
  expect(onUnmetered).toHaveBeenCalledTimes(1);
});

test("DR2. 건너뛴 편이 없으면 켜지 않고, 켜져 있던 것도 끈다", () => {
  const onUnmetered = vi.fn();
  const recheck = createDeferredRecheck({ intervalMs: 1000, isUnmetered: () => true, onUnmetered });
  recheck.update(false);
  vi.advanceTimersByTime(5000);
  expect(onUnmetered).not.toHaveBeenCalled();
  recheck.update(true);
  recheck.update(false);
  vi.advanceTimersByTime(5000);
  expect(onUnmetered).not.toHaveBeenCalled();
});

test("DR3. 여러 번 켜도 타이머는 하나다 — 알림도 한 번", () => {
  const onUnmetered = vi.fn();
  const recheck = createDeferredRecheck({ intervalMs: 1000, isUnmetered: () => true, onUnmetered });
  recheck.update(true);
  recheck.update(true);
  recheck.update(true);
  vi.advanceTimersByTime(1000);
  expect(onUnmetered).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test("DR4. stop 뒤에는 알리지 않는다 · 연결 읽기가 던져도 멈추지 않고 다음 간격에 다시 본다", () => {
  const onUnmetered = vi.fn();
  let calls = 0;
  const recheck = createDeferredRecheck({
    intervalMs: 1000,
    isUnmetered: () => {
      calls += 1;
      if (calls === 1) throw new Error("bridge");
      return true;
    },
    onUnmetered,
  });
  recheck.update(true);
  vi.advanceTimersByTime(1000);
  expect(onUnmetered).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(onUnmetered).toHaveBeenCalledTimes(1);

  recheck.update(true);
  recheck.stop();
  vi.advanceTimersByTime(5000);
  expect(onUnmetered).toHaveBeenCalledTimes(1);
});
