import { describe, expect, it } from "vitest";

import { episodePrologueFor } from "./prologue";

// `unit` 계층: 조회 함수의 입출력만 봅니다 (ADR-0006 D4). 대본의 값은 임시라 단언하지
// 않습니다 — 단언하는 것은 값이 바뀌어도 지켜져야 하는 형태입니다.

describe("episodePrologueFor", () => {
  it("R1. 튜토리얼에는 서사가 있고, 그 대사가 비어 있지 않다", () => {
    const prologue = episodePrologueFor("tutorial");

    expect(prologue).toBeDefined();
    const lines =
      prologue?.kind === "call"
        ? prologue.call.lines
        : prologue?.kind === "messenger"
          ? prologue.chat.messages
          : [];
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.text.trim()).not.toBe("");
      expect(line.translation.trim()).not.toBe("");
    }
  });

  it("R2. 서사가 없는 에피소드는 던지지 않고 undefined다", () => {
    expect(episodePrologueFor("no-such-episode")).toBeUndefined();
  });
});
