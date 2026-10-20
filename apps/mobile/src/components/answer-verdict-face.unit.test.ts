import { color, opacity } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import type { AnswerResult } from "../lib/answer-result";
import { rgbaOfHex } from "../lib/surface-tone";
import {
  compositeOver,
  contrastRatio,
  DARK_SURFACE_WORST,
  parseCssColor,
} from "../lib/wcag-contrast.test-support";

import { answerVerdictFaceColor } from "./answer-verdict-face";

// `unit` 계층: 판정과 면 밝기에서 배지 면 색을 계산하는 순수 함수만 봅니다.

const results: readonly AnswerResult[] = ["correct", "incorrect"];

describe("answerVerdictFaceColor", () => {
  it("[AVF1] light는 지금의 꽉 찬 feedback 색 그대로다", () => {
    expect(answerVerdictFaceColor("correct", "light")).toBe(color.feedback.correct);
    expect(answerVerdictFaceColor("incorrect", "light")).toBe(color.feedback.incorrect);
    expect(answerVerdictFaceColor("correct", "light")).toBe("#35A66F");
  });

  it("[AVF2] dark는 feedback 색 x opacity 16의 rgba다", () => {
    expect(answerVerdictFaceColor("correct", "dark")).toBe("rgba(53, 166, 111, 0.16)");
    expect(answerVerdictFaceColor("incorrect", "dark")).toBe("rgba(223, 77, 84, 0.16)");
    for (const result of results) {
      expect(answerVerdictFaceColor(result, "dark")).toBe(
        rgbaOfHex(color.feedback[result], opacity["16"]),
      );
    }
  });

  it("[FDK3] 어두운 면 위 흰 낱말 · 아이콘은 최악의 배경에서도 4.5:1 이상이다", () => {
    const ink = parseCssColor(color.fg["neutral-inverted"]).rgb;
    for (const result of results) {
      const face = compositeOver(
        parseCssColor(answerVerdictFaceColor(result, "dark")),
        DARK_SURFACE_WORST,
      );
      expect(contrastRatio(ink, face)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
