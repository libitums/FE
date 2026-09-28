import { describe, expect, it } from "vitest";

import { listeningPromptScale } from "./listening-prompt-scale";
import { listeningQuestionsByStep } from "./listening-questions";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("listeningPromptScale", () => {
  it("짧은 구절은 가장 큰 단계다 — 디자인 값이 서는 자리", () => {
    expect(listeningPromptScale("이거 주세요")).toBe("l");
  });

  it("한 줄을 넘으면 한 단 내려간다", () => {
    expect(listeningPromptScale("따뜻한 아메리카노 한 잔 주세요.")).toBe("m");
  });

  it("두 줄을 넘으면 가장 작은 단계다", () => {
    expect(
      listeningPromptScale("주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?"),
    ).toBe("s");
  });

  // 경계를 값으로 못박습니다 — 어림값이 바뀌면 여기가 먼저 빨개집니다.
  it("경계에서 단계가 갈린다", () => {
    expect(listeningPromptScale("가".repeat(10))).toBe("l");
    expect(listeningPromptScale("가".repeat(11))).toBe("m");
    expect(listeningPromptScale("가".repeat(24))).toBe("m");
    expect(listeningPromptScale("가".repeat(25))).toBe("s");
  });

  it("빈 문자열도 던지지 않는다", () => {
    expect(listeningPromptScale("")).toBe("l");
  });

  // 오늘의 문항 열다섯이 전부 세 단계 안에 들어갑니다 — 넷째 단계가 필요해지면
  // 여기가 아니라 `listeningPromptScale`이 답을 못 내는 것으로 드러납니다.
  it("실물 문항이 전부 세 단계 안에 든다", () => {
    const scales = Object.values(listeningQuestionsByStep)
      .flat()
      .map((question) => listeningPromptScale(question.prompt));

    expect(scales).toHaveLength(15);
    expect(new Set(scales)).toEqual(new Set(["l", "m", "s"]));
  });
});
