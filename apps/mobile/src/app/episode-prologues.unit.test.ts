import { describe, expect, it } from "vitest";

import { episodePrologueFor } from "./episode-prologues";

// `unit` 계층: 조회 함수의 입출력만 봅니다 (ADR-0006 D4). 대본의 값은 임시라 단언하지
// 않습니다 — 단언하는 것은 형식과 모양입니다.

describe("episodePrologueFor", () => {
  it("R1. 튜토리얼의 서사는 비주얼 노벨이고 장면이 있다", () => {
    const prologue = episodePrologueFor("tutorial");

    expect(prologue?.kind).toBe("visual-novel");
    if (prologue?.kind === "visual-novel") {
      expect(prologue.narrative.beats.length).toBeGreaterThan(0);
    }
  });

  it("R2. 서사가 없는 에피소드는 던지지 않고 undefined다", () => {
    expect(episodePrologueFor("no-such-episode")).toBeUndefined();
  });
});
