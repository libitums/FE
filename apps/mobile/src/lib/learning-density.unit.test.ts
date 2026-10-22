import { describe, expect, test } from "vitest";

import {
  learningDensityOf,
  learningRegularMinHeight,
  questionDensityOf,
  screenHeightFrom,
} from "./learning-density";
import type { SafeAreaInsets } from "./safe-area";

function insets(top: number, bottom: number): SafeAreaInsets {
  return { top, bottom, left: 0, right: 0 };
}

describe("screenHeightFrom (DN1)", () => {
  test("픽셀 높이를 비율로 나눈 pt 높이를 낸다", () => {
    expect(screenHeightFrom({ pixelHeight: 2436, pixelRatio: 3 })).toBe(812);
    expect(screenHeightFrom({ pixelHeight: 2532, pixelRatio: 3 })).toBe(844);
  });

  test("정보가 없거나 비율이 0이거나 NaN이면 NaN이다", () => {
    expect(screenHeightFrom(undefined)).toBeNaN();
    expect(screenHeightFrom({ pixelHeight: 2436, pixelRatio: 0 })).toBeNaN();
    expect(screenHeightFrom({ pixelHeight: Number.NaN, pixelRatio: 3 })).toBeNaN();
    expect(screenHeightFrom({ pixelHeight: 2436, pixelRatio: Number.NaN })).toBeNaN();
  });
});

describe("learningDensityOf (DN2, DN3)", () => {
  test("문턱 상수는 756이다", () => {
    expect(learningRegularMinHeight).toBe(756);
  });

  test("쓸 수 있는 높이가 기기별로 갈린다", () => {
    expect(learningDensityOf(812, insets(50, 34))).toBe("compact");
    expect(learningDensityOf(844, insets(47, 34))).toBe("regular");
    expect(learningDensityOf(852, insets(59, 34))).toBe("regular");
  });

  test("755는 compact, 756은 regular다", () => {
    expect(learningDensityOf(755, insets(0, 0))).toBe("compact");
    expect(learningDensityOf(756, insets(0, 0))).toBe("regular");
    expect(learningDensityOf(840, insets(50, 34))).toBe("regular");
    expect(learningDensityOf(839, insets(50, 34))).toBe("compact");
  });

  test("높이를 모르면 compact다", () => {
    expect(learningDensityOf(Number.NaN, insets(0, 0))).toBe("compact");
  });
});

describe("questionDensityOf (DN4)", () => {
  test("긴 글은 늘 compact다", () => {
    expect(questionDensityOf("regular", "long")).toBe("compact");
    expect(questionDensityOf("compact", "long")).toBe("compact");
  });

  test("긴 글이 아니면 기기 밀도 그대로다", () => {
    expect(questionDensityOf("regular", "regular")).toBe("regular");
    expect(questionDensityOf("compact", "regular")).toBe("compact");
  });
});
