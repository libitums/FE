import { describe, expect, test } from "vitest";

import { listeningPromptScale } from "../screens/listening/listening-prompt-scale";
import { koreanBrandToneOf, koreanTextStepOf, romanizationSizeFor } from "./korean-text-step";

function text(length: number): string {
  return "가".repeat(length);
}

describe("koreanTextStepOf (KS1, KS2)", () => {
  test("regular: 10자 display, 11 ~ 24자 heading-l, 25자부터 heading-m", () => {
    expect(koreanTextStepOf(text(1), "regular")).toBe("display");
    expect(koreanTextStepOf(text(10), "regular")).toBe("display");
    expect(koreanTextStepOf(text(11), "regular")).toBe("heading-l");
    expect(koreanTextStepOf(text(24), "regular")).toBe("heading-l");
    expect(koreanTextStepOf(text(25), "regular")).toBe("heading-m");
    expect(koreanTextStepOf(text(40), "regular")).toBe("heading-m");
  });

  test("compact: 같은 길이에서 한 단계 아래다", () => {
    expect(koreanTextStepOf(text(10), "compact")).toBe("heading-l");
    expect(koreanTextStepOf(text(11), "compact")).toBe("heading-m");
    expect(koreanTextStepOf(text(24), "compact")).toBe("heading-m");
    expect(koreanTextStepOf(text(25), "compact")).toBe("heading-s");
  });
});

describe("koreanBrandToneOf (KS3)", () => {
  test("heading-s만 fg-brand, 나머지는 brand-primary다", () => {
    expect(koreanBrandToneOf("heading-s")).toBe("fg-brand");
    expect(koreanBrandToneOf("display")).toBe("brand-primary");
    expect(koreanBrandToneOf("heading-l")).toBe("brand-primary");
    expect(koreanBrandToneOf("heading-m")).toBe("brand-primary");
  });
});

describe("romanizationSizeFor (KS4)", () => {
  test("display와 heading-l은 m, heading-m과 heading-s는 s다", () => {
    expect(romanizationSizeFor("display")).toBe("m");
    expect(romanizationSizeFor("heading-l")).toBe("m");
    expect(romanizationSizeFor("heading-m")).toBe("s");
    expect(romanizationSizeFor("heading-s")).toBe("s");
  });
});

describe("listeningPromptScale과의 경계 (KS5)", () => {
  test("1 ~ 40자 전부에서 l, m, s가 regular 단계 display, heading-l, heading-m과 짝이다", () => {
    const pairs = { l: "display", m: "heading-l", s: "heading-m" } as const;
    for (let length = 1; length <= 40; length += 1) {
      const sample = text(length);
      expect(koreanTextStepOf(sample, "regular")).toBe(pairs[listeningPromptScale(sample)]);
    }
  });
});
