import { describe, expect, test } from "vitest";

import {
  feedbackMessageMaxLength,
  feedbackMessageOf,
  feedbackReasons,
  feedbackReasonsOf,
  surveyAsksReasons,
  surveyMessageOf,
  surveyReasonsMaxRating,
} from "./feedback-api";

// 에피소드 끝 설문의 낮은 별점 이유 단계(ADR-0036 개정 2026-11-12 글 칸 → 2026-11-17 체크리스트)의 순수 판정입니다.

describe("SM1 surveyAsksReasons", () => {
  test("SM1. 1 · 2 · 3점은 이유 단계로, 4 · 5점은 바로 끝낸다", () => {
    expect(surveyReasonsMaxRating).toBe(3);
    expect([1, 2, 3, 4, 5].map((r) => surveyAsksReasons(r as 1 | 2 | 3 | 4 | 5))).toEqual([
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

describe("FR feedbackReasons · feedbackReasonsOf · surveyMessageOf", () => {
  test("FR1. 체크리스트는 사용자가 고른 여덟 항목이고 「Other」가 마지막이다(2026-11-17 결정)", () => {
    expect(feedbackReasons).toEqual([
      "too-hard",
      "too-easy",
      "audio",
      "unclear",
      "translation",
      "stuck",
      "too-long",
      "other",
    ]);
  });

  test("FR2. 고른 순서와 상관없이 표시 순서로, 중복 없이 낸다", () => {
    expect(feedbackReasonsOf(["other", "audio", "too-hard", "audio"])).toEqual([
      "too-hard",
      "audio",
      "other",
    ]);
    expect(feedbackReasonsOf([])).toEqual([]);
  });

  test("FR3. 모르는 id는 버린다", () => {
    expect(feedbackReasonsOf(["boring", "stuck", ""])).toEqual(["stuck"]);
  });

  test("FR4. 글은 「Other」를 골랐을 때만 — 없으면 쓴 글이 있어도 null", () => {
    expect(surveyMessageOf(["audio"], "Too fast.")).toBeNull();
    expect(surveyMessageOf(["audio", "other"], "  Too fast.  ")).toBe("Too fast.");
    expect(surveyMessageOf(["other"], "   ")).toBeNull();
  });
});
