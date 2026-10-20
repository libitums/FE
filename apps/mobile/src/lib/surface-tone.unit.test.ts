import { describe, expect, it } from "vitest";

import { rgbaOfHex, surfaceToneClassName } from "./surface-tone";

// `unit` 계층: DOM · 컴포넌트를 import하지 않고 순수 함수의 입출력만 봅니다.

describe("surfaceToneClassName", () => {
  it("[ST1] light는 base 그대로, dark는 끝에 `<block>-surface-dark`를 공백 하나로 더한다", () => {
    expect(surfaceToneClassName("answer-reveal", "answer-reveal", "light")).toBe("answer-reveal");
    expect(surfaceToneClassName("answer-reveal", "answer-reveal", "dark")).toBe(
      "answer-reveal answer-reveal-surface-dark",
    );
    expect(surfaceToneClassName("a a-b", "a", "dark")).toBe("a a-b a-surface-dark");
  });

  it("[ST2] light는 어떤 base든 같은 문자열을 돌려준다", () => {
    for (const base of ["x", "x y", "", "sentence-order-chip sentence-order-chip-bank"]) {
      expect(surfaceToneClassName(base, "x", "light") === base).toBe(true);
    }
  });
});

describe("rgbaOfHex", () => {
  it("[ST3] #RRGGBB(대소문자 무관)와 알파를 rgba 문자열로 바꾼다", () => {
    expect(rgbaOfHex("#35A66F", 0.16)).toBe("rgba(53, 166, 111, 0.16)");
    expect(rgbaOfHex("#1a1c20", 0.9)).toBe("rgba(26, 28, 32, 0.9)");
    expect(rgbaOfHex("#FFFFFF", 0)).toBe("rgba(255, 255, 255, 0)");
    expect(rgbaOfHex("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });

  it("[ST4] 형식이 다르거나 알파가 범위 밖 · 비유한이면 RangeError", () => {
    for (const hex of ["#FFF", "35A66F", "#35A66F80", "#GGGGGG"]) {
      expect(() => rgbaOfHex(hex, 0.5)).toThrow(RangeError);
    }
    for (const alpha of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => rgbaOfHex("#35A66F", alpha)).toThrow(RangeError);
    }
  });
});
