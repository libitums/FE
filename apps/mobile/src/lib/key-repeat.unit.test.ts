import { describe, expect, test } from "vitest";

import { KEY_REPEAT, createKeyRepeater } from "./key-repeat";
import type { RepeatTimers } from "./key-repeat";

// `unit` 계층: 지우기 반복(ADR-0112). 지연 뒤 첫 반복 · 일정 간격 · 상한에서 멈춤 · 타이머 하나.

/** 손으로 돌리는 타이머. 살아 있는 타이머 수를 셀 수 있다. */
function manualTimers() {
  let clock = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  const timers: RepeatTimers = {
    setTimeout(fn, ms) {
      const id = nextId;
      nextId += 1;
      pending.set(id, { at: clock + ms, fn });
      return id;
    },
    clearTimeout(handle) {
      pending.delete(handle as number);
    },
  };
  const advance = (ms: number) => {
    const end = clock + ms;
    for (;;) {
      const due = [...pending.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (due === undefined) break;
      pending.delete(due[0]);
      clock = due[1].at;
      due[1].fn();
    }
    clock = end;
  };
  return { timers, advance, alive: () => pending.size };
}

describe("createKeyRepeater", () => {
  test("KT-U13. 지연 뒤 첫 반복, 이후 간격마다, 멈추면 끝", () => {
    const { timers, advance } = manualTimers();
    let count = 0;
    const repeater = createKeyRepeater(() => {
      count += 1;
    }, timers);

    repeater.start();
    expect(repeater.active).toBe(true);
    advance(KEY_REPEAT.delayMs - 1);
    expect(count).toBe(0);
    advance(1);
    expect(count).toBe(1);
    advance(KEY_REPEAT.intervalMs);
    expect(count).toBe(2);
    advance(KEY_REPEAT.intervalMs * 3);
    expect(count).toBe(5);
    repeater.stop();
    expect(repeater.active).toBe(false);
    advance(10_000);
    expect(count).toBe(5);
  });

  test("KT-U14. 상한에서 스스로 멈춘다", () => {
    const { timers, advance, alive } = manualTimers();
    let count = 0;
    const repeater = createKeyRepeater(() => {
      count += 1;
    }, timers);

    repeater.start();
    advance(60_000);
    expect(count).toBe(KEY_REPEAT.maxRepeats);
    expect(repeater.active).toBe(false);
    expect(alive()).toBe(0);
  });

  test("KT-U15. 두 번 시작해도 살아 있는 타이머는 하나, 멈춤은 여러 번 안전", () => {
    const { timers, advance, alive } = manualTimers();
    let count = 0;
    const repeater = createKeyRepeater(() => {
      count += 1;
    }, timers);

    repeater.start();
    advance(200);
    repeater.start();
    expect(alive()).toBe(1);
    advance(KEY_REPEAT.delayMs - 1);
    expect(count).toBe(0);
    advance(1);
    expect(count).toBe(1);
    repeater.stop();
    repeater.stop();
    expect(alive()).toBe(0);
    expect(() => repeater.stop()).not.toThrow();
  });

  test("KT-U16. 반복이 던지면 멈추고 밖으로 던지지 않는다", () => {
    const { timers, advance, alive } = manualTimers();
    let count = 0;
    const repeater = createKeyRepeater(() => {
      count += 1;
      throw new Error("boom");
    }, timers);

    repeater.start();
    expect(() => advance(5_000)).not.toThrow();
    expect(count).toBe(1);
    expect(repeater.active).toBe(false);
    expect(alive()).toBe(0);
  });

  // review W2: 반복 콜백 안에서 부른 stop()이 그 자리에서 반복을 끝낸다.
  test("KT-U24. 반복 안에서 멈추면 다음 반복이 없고 타이머도 없다", () => {
    const { timers, advance, alive } = manualTimers();
    let count = 0;
    const repeater = createKeyRepeater(() => {
      count += 1;
      if (count === 3) repeater.stop();
    }, timers);

    repeater.start();
    advance(60_000);
    expect(count).toBe(3);
    expect(repeater.active).toBe(false);
    expect(alive()).toBe(0);
  });
});
