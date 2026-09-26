import { describe, expect, it } from "vitest";

import { stepSheetProgress } from "./journey-map-sheet";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("stepSheetProgress", () => {
  it("낱말 둘과 막대가 같은 수에서 나온다", () => {
    expect(stepSheetProgress(1, 4)).toEqual({
      countLabel: "1/4 활동",
      percentLabel: "25%",
      fillPercent: 25,
    });
  });

  it("아직 아무것도 안 끝냈으면 0%이고 막대도 0이다", () => {
    expect(stepSheetProgress(0, 3)).toEqual({
      countLabel: "0/3 활동",
      percentLabel: "0%",
      fillPercent: 0,
    });
  });

  it("다 끝냈으면 100%다", () => {
    expect(stepSheetProgress(3, 3)).toEqual({
      countLabel: "3/3 활동",
      percentLabel: "100%",
      fillPercent: 100,
    });
  });

  // 라벨은 반올림하고 막대는 반올림하지 않습니다 — 낱말은 자리를 아끼고 막대는
  // 자리를 아낄 이유가 없습니다. 둘이 같은 수에서 나온다는 것은 그대로입니다.
  it("나누어떨어지지 않으면 라벨만 반올림한다", () => {
    expect(stepSheetProgress(1, 3)).toEqual({
      countLabel: "1/3 활동",
      percentLabel: "33%",
      fillPercent: (1 / 3) * 100,
    });
  });

  it("전체 활동 수가 0이면 던진다", () => {
    expect(() => stepSheetProgress(0, 0)).toThrow(/1 이상의 정수/);
  });

  it("끝낸 수가 전체보다 많으면 던진다", () => {
    expect(() => stepSheetProgress(4, 3)).toThrow(/전체보다 많습니다/);
  });

  it("끝낸 수가 음수면 던진다", () => {
    expect(() => stepSheetProgress(-1, 3)).toThrow(/0 이상의 정수/);
  });
});
