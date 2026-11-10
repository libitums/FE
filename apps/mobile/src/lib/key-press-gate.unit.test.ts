import { describe, expect, test } from "vitest";

import {
  KEY_PRESS_GATE,
  emptyKeyPressGate,
  gateTap,
  gateTouchEnd,
  gateTouchStart,
  hasOpenPress,
} from "./key-press-gate";
import type { KeyPressGate } from "./key-press-gate";

// `unit` 계층: 한 누름 = 한 입력(ADR-0112). touchstart가 입력하고 같은 누름의 tap은 버린다.
// touchstart 없이 오는 tap(스크린리더 · 유실)은 입력한다.

type Step =
  | readonly ["start", string, number]
  | readonly ["end", string, number]
  | readonly ["tap", string, number];

/** 단계를 차례로 돌리고 입력된 키를 순서대로 돌려준다. */
function run(steps: readonly Step[], from: KeyPressGate = emptyKeyPressGate) {
  let gate = from;
  const emitted: string[] = [];
  for (const [kind, key, now] of steps) {
    if (kind === "start") {
      const next = gateTouchStart(gate, key, now);
      gate = next.gate;
      if (next.emit) emitted.push(key);
    } else if (kind === "end") {
      gate = gateTouchEnd(gate, key, now);
    } else {
      const next = gateTap(gate, key, now);
      gate = next.gate;
      if (next.emit) emitted.push(key);
    }
  }
  return { gate, emitted };
}

const recordCount = (gate: KeyPressGate): number =>
  Object.values(gate.presses).reduce((total, list) => total + list.length, 0);

describe("key-press-gate", () => {
  test("KT-U6. touchstart는 항상 입력한다", () => {
    expect(gateTouchStart(emptyKeyPressGate, "ㅂ", 0).emit).toBe(true);
    expect(
      run([
        ["start", "ㅂ", 0],
        ["start", "ㅂ", 10],
      ]).emitted,
    ).toEqual(["ㅂ", "ㅂ"]);
  });

  test("KT-U7. 같은 누름 끝의 tap은 버린다", () => {
    expect(
      run([
        ["start", "ㅂ", 0],
        ["end", "ㅂ", 90],
        ["tap", "ㅂ", 95],
      ]).emitted,
    ).toEqual(["ㅂ"]);
    expect(
      run([
        ["start", "ㅂ", 0],
        ["end", "ㅂ", 90],
        ["tap", "ㅂ", 90 + KEY_PRESS_GATE.tapAfterEndMs],
      ]).emitted,
    ).toEqual(["ㅂ"]);
  });

  test("KT-U7. 끝 이벤트보다 tap이 먼저 와도 같은 누름이면 버린다", () => {
    expect(
      run([
        ["start", "ㅂ", 0],
        ["tap", "ㅂ", 80],
        ["end", "ㅂ", 85],
      ]).emitted,
    ).toEqual(["ㅂ"]);
  });

  test("KT-U8. touchstart 없이 온 tap은 입력한다", () => {
    expect(gateTap(emptyKeyPressGate, "ㅂ", 0).emit).toBe(true);
    expect(
      run([
        ["tap", "ㅂ", 0],
        ["tap", "ㅂ", 300],
      ]).emitted,
    ).toEqual(["ㅂ", "ㅂ"]);
  });

  test("KT-U9. 끝난 뒤 창을 넘긴 tap은 새 입력이다", () => {
    expect(
      run([
        ["start", "ㅂ", 0],
        ["end", "ㅂ", 90],
        ["tap", "ㅂ", 91 + KEY_PRESS_GATE.tapAfterEndMs],
      ]).emitted,
    ).toEqual(["ㅂ", "ㅂ"]);
  });

  test("KT-U9. 끝 없이 열린 채 오래된 기록은 tap을 막지 않는다", () => {
    expect(
      run([
        ["start", "ㅂ", 0],
        ["tap", "ㅂ", KEY_PRESS_GATE.openPressMs + 1],
      ]).emitted,
    ).toEqual(["ㅂ", "ㅂ"]);
  });

  test("KT-U10. 같은 키 빠른 두 번은 tap 둘 다 버린다", () => {
    expect(
      run([
        ["start", "ㅏ", 0],
        ["end", "ㅏ", 60],
        ["start", "ㅏ", 120],
        ["end", "ㅏ", 180],
        ["tap", "ㅏ", 185],
        ["tap", "ㅏ", 190],
      ]).emitted,
    ).toEqual(["ㅏ", "ㅏ"]);
  });

  test("KT-U10. 키마다 따로다 — ㅂ의 기록이 ㅈ의 tap을 막지 않는다", () => {
    expect(
      run([
        ["start", "ㅂ", 0],
        ["end", "ㅂ", 50],
        ["tap", "ㅈ", 60],
      ]).emitted,
    ).toEqual(["ㅂ", "ㅈ"]);
  });

  test("KT-U10. 겹친 두 누름(두 손가락)도 각자 한 번씩", () => {
    expect(
      run([
        ["start", "ㅇ", 0],
        ["start", "ㅏ", 40],
        ["end", "ㅇ", 70],
        ["tap", "ㅇ", 72],
        ["end", "ㅏ", 110],
        ["tap", "ㅏ", 112],
      ]).emitted,
    ).toEqual(["ㅇ", "ㅏ"]);
  });

  test("KT-U11. 끝 이벤트가 유실된 기록은 창을 벗어나면 버려진다", () => {
    const steps: Step[] = [];
    for (let i = 0; i < 200; i += 1) steps.push(["start", "ㅂ", i * 10]);
    const { gate } = run(steps);
    const later = gateTap(gate, "ㅈ", 200 * 10 + KEY_PRESS_GATE.openPressMs + 1).gate;
    expect(recordCount(later)).toBe(0);
  });

  test("KT-U11. 시계가 뒤로 가도 던지지 않는다", () => {
    expect(() =>
      run([
        ["start", "ㅂ", 1000],
        ["end", "ㅂ", 500],
        ["tap", "ㅂ", 100],
        ["start", "ㅂ", -5],
      ]),
    ).not.toThrow();
  });

  test("KT-U12. 들어온 값을 바꾸지 않는다", () => {
    const before = gateTouchStart(emptyKeyPressGate, "ㅂ", 0).gate;
    const snapshot = JSON.stringify(before);
    gateTouchEnd(before, "ㅂ", 10);
    gateTap(before, "ㅂ", 20);
    gateTouchStart(before, "ㅂ", 30);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(JSON.stringify(emptyKeyPressGate)).toBe(JSON.stringify({ presses: {} }));
  });

  test("KT-U21. 열린 누름이 있는지 — 끝나거나 창을 넘기면 없다", () => {
    const started = gateTouchStart(emptyKeyPressGate, "backspace", 0).gate;
    expect(hasOpenPress(started, "backspace", 100)).toBe(true);
    expect(hasOpenPress(started, "ㅂ", 100)).toBe(false);
    expect(hasOpenPress(started, "backspace", KEY_PRESS_GATE.openPressMs + 1)).toBe(false);
    expect(hasOpenPress(gateTouchEnd(started, "backspace", 200), "backspace", 210)).toBe(false);
    expect(hasOpenPress(emptyKeyPressGate, "backspace", 0)).toBe(false);
  });

  // review W1: 3초 넘게 누른 뒤의 끝 · tap도 같은 누름이다 — 두 번 입력되지 않는다.
  test("KT-U22. 오래 누른 뒤 끝 · tap은 버린다(다른 키 입력이 사이에 있어도)", () => {
    expect(
      run([
        ["start", "shift", 0],
        ["end", "shift", 3200],
        ["tap", "shift", 3210],
      ]).emitted,
    ).toEqual(["shift"]);
    expect(
      run([
        ["start", "backspace", 0],
        ["start", "ㅂ", 3100],
        ["end", "ㅂ", 3150],
        ["tap", "ㅂ", 3160],
        ["end", "backspace", 3200],
        ["tap", "backspace", 3210],
      ]).emitted,
    ).toEqual(["backspace", "ㅂ"]);
  });

  test("KT-U23. 같은 키를 새로 누르면 끝이 빠진 앞 누름은 닫힌 것으로 본다", () => {
    const { gate } = run([
      ["start", "ㅂ", 0],
      ["start", "ㅂ", 100],
    ]);
    expect(hasOpenPress(gate, "ㅂ", 110)).toBe(true);
    const ended = gateTouchEnd(gate, "ㅂ", 120);
    expect(hasOpenPress(ended, "ㅂ", 130)).toBe(false);
  });
});
