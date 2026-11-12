import { describe, expect, test } from "vitest";

import {
  feedbackMessageMaxLength,
  feedbackMessageOf,
  surveyAsksMessage,
  surveyMessageMaxRating,
} from "./feedback-api";

// 에피소드 끝 설문의 낮은 별점 글 단계(ADR-0036 개정 2026-11-12)의 순수 판정입니다.

describe("SM1 surveyAsksMessage", () => {
  test("SM1. 1 · 2 · 3점은 글 단계로, 4 · 5점은 바로 끝낸다", () => {
    expect(surveyMessageMaxRating).toBe(3);
    expect([1, 2, 3, 4, 5].map((r) => surveyAsksMessage(r as 1 | 2 | 3 | 4 | 5))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("SM2 feedbackMessageOf", () => {
  test("SM2a. 비었거나 공백뿐이면 null", () => {
    expect(feedbackMessageOf("")).toBeNull();
    expect(feedbackMessageOf("   \n\t ")).toBeNull();
  });

  test("SM2b. 앞뒤 공백을 지운 글", () => {
    expect(feedbackMessageOf("  Too hard to read.  ")).toBe("Too hard to read.");
  });

  test("SM2c. 상한(500자)을 넘으면 자른다", () => {
    const long = "a".repeat(feedbackMessageMaxLength + 20);
    expect(feedbackMessageOf(long)).toBe("a".repeat(feedbackMessageMaxLength));
  });
});
