import { describe, expect, test, vi } from "vitest";

import { createTrialStore } from "./trial-store";

// `unit` 계층(CP-U4): 체험 남은 수 저장 — 서버 지갑(`trialRemaining`)이 정본이고, 보낸 체험 한 통은 서버 답을 기다리지 않고
// 하나 줄여 보입니다(다음 서버 값이 덮습니다). 같은 값이면 알리지 않습니다.

describe("createTrialStore (CP-U4)", () => {
  test("CP-U4. 처음 값 · set은 서버 값을 그대로 · 음수 · 소수 · NaN은 버린다", () => {
    const store = createTrialStore(null);
    expect(store.remaining()).toBeNull();
    store.set(12);
    expect(store.remaining()).toBe(12);
    store.set(-1);
    store.set(1.5);
    store.set(Number.NaN);
    expect(store.remaining()).toBe(12);
    store.set(null);
    expect(store.remaining()).toBeNull();
  });

  test("CP-U4. consume은 하나 줄이고 0 아래로 내려가지 않는다 · 모르면(null) 그대로", () => {
    const store = createTrialStore(1);
    store.consume();
    expect(store.remaining()).toBe(0);
    store.consume();
    expect(store.remaining()).toBe(0);
    const unknown = createTrialStore(null);
    unknown.consume();
    expect(unknown.remaining()).toBeNull();
  });

  test("CP-U4. 값이 바뀔 때만 구독자에게 알리고, 해제하면 더 알리지 않는다", () => {
    const store = createTrialStore(5);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set(5);
    expect(listener).not.toHaveBeenCalled();
    store.consume();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.set(9);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
