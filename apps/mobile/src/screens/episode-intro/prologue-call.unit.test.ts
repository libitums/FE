import { describe, expect, it } from "vitest";

import {
  initialPrologueCallVolume,
  prologueCallClock,
  prologueCallFor,
  prologueCallProgress,
  stepPrologueCallVolume,
} from "./prologue-call";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4). 대본의 값은 임시라 단언하지
// 않습니다 — 단언하는 것은 값이 바뀌어도 지켜져야 하는 형태입니다.

describe("prologueCallFor", () => {
  it("C1. 튜토리얼에는 대사가 있는 통화가 있다", () => {
    const call = prologueCallFor("tutorial");

    expect(call?.callerName.trim()).not.toBe("");
    expect(call?.lines.length).toBeGreaterThan(0);
    for (const line of call?.lines ?? []) {
      expect(line.text.trim()).not.toBe("");
      expect(line.translation.trim()).not.toBe("");
    }
  });

  it("C2. 통화가 없는 에피소드는 던지지 않고 undefined다", () => {
    expect(prologueCallFor("no-such-episode")).toBeUndefined();
  });
});

describe("prologueCallProgress", () => {
  it("P1. 대사마다 정해진 시간씩 머문다", () => {
    expect(prologueCallProgress(0, 3, 3)).toEqual({ lineIndex: 0, ended: false });
    expect(prologueCallProgress(2, 3, 3)).toEqual({ lineIndex: 0, ended: false });
    expect(prologueCallProgress(3, 3, 3)).toEqual({ lineIndex: 1, ended: false });
    expect(prologueCallProgress(8, 3, 3)).toEqual({ lineIndex: 2, ended: false });
  });

  it("P2. 마지막 대사가 머문 뒤 끝나고, 대사 자리는 마지막에 머문다", () => {
    expect(prologueCallProgress(9, 3, 3)).toEqual({ lineIndex: 2, ended: true });
    expect(prologueCallProgress(100, 3, 3)).toEqual({ lineIndex: 2, ended: true });
  });

  it("P3. 음수 시간은 0으로 본다", () => {
    expect(prologueCallProgress(-5, 3, 3)).toEqual({ lineIndex: 0, ended: false });
  });

  it("P4. 대사가 없으면 자리가 음수가 되지 않고 곧장 끝난다", () => {
    expect(prologueCallProgress(0, 0, 3)).toEqual({ lineIndex: 0, ended: true });
  });
});

describe("prologueCallClock", () => {
  it("K1. 분:초 두 자리로 적는다", () => {
    expect(prologueCallClock(0)).toBe("0:00");
    expect(prologueCallClock(7)).toBe("0:07");
    expect(prologueCallClock(65)).toBe("1:05");
  });

  it("K2. 소수와 음수를 다듬는다", () => {
    expect(prologueCallClock(9.9)).toBe("0:09");
    expect(prologueCallClock(-3)).toBe("0:00");
  });
});

describe("stepPrologueCallVolume", () => {
  it("V1. 한 단계씩 오르내린다", () => {
    expect(stepPrologueCallVolume(3, "up")).toBe(4);
    expect(stepPrologueCallVolume(3, "down")).toBe(2);
  });

  it("V2. 양 끝에서는 그대로다 — 소리를 없애는 것은 음소거의 몫이다", () => {
    expect(stepPrologueCallVolume(5, "up")).toBe(5);
    expect(stepPrologueCallVolume(1, "down")).toBe(1);
  });

  it("V3. 처음 크기는 양 끝이 아니다", () => {
    expect(initialPrologueCallVolume).toBeGreaterThan(1);
    expect(initialPrologueCallVolume).toBeLessThan(5);
  });
});
