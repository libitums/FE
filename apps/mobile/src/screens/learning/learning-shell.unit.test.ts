import { describe, expect, it } from "vitest";

import { learningSessionHeader } from "./learning-shell.contract";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("learningSessionHeader", () => {
  it("첫 활동은 순번 1이고 아직 0%다", () => {
    expect(learningSessionHeader("listening", 0, 4)).toEqual({
      chapterLabel: "Chapter 1 / 4",
      formLabel: "Listening",
      percentLabel: "0%",
      fillPercent: 0,
      accessibilityLabel: "Listening, 활동 4개 중 1번째",
    });
  });

  // 지금 하는 활동은 아직 안 끝났으므로 순번이 곧 끝낸 수입니다. 마지막 활동에서도
  // 100%가 아닙니다 — 100%는 유닛을 마쳤을 때만 나옵니다.
  it("마지막 활동에서도 100%가 아니다", () => {
    const header = learningSessionHeader("word-choice", 3, 4);

    expect(header.chapterLabel).toBe("Chapter 4 / 4");
    expect(header.percentLabel).toBe("75%");
    expect(header.fillPercent).toBe(75);
  });

  it("학습형마다 이름이 갈린다", () => {
    expect(learningSessionHeader("sentence-order", 0, 1).formLabel).toBe("Word order");
    expect(learningSessionHeader("culture", 0, 1).formLabel).toBe("Culture");
  });

  it("활동 수가 0이면 던진다", () => {
    expect(() => learningSessionHeader("listening", 0, 0)).toThrow(/1 이상의 정수/);
  });

  it("순번이 활동 수를 넘으면 던진다", () => {
    expect(() => learningSessionHeader("listening", 4, 4)).toThrow(/활동 수를 넘습니다/);
  });

  it("순번이 음수면 던진다", () => {
    expect(() => learningSessionHeader("listening", -1, 4)).toThrow(/0 이상의 정수/);
  });
});
