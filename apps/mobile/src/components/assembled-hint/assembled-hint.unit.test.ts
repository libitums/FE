import { describe, expect, test } from "vitest";

import { strongerHint, tileReadingOf, tileRomanizationsShown } from "./assembled-hint.contract";

// `unit` 계층: 조립 문항 힌트 · 타일 로마자의 순수 규칙(ADR-0153).

describe("strongerHint", () => {
  test("AH1. 정답 보기가 정답 듣기보다 앞선다", () => {
    expect(strongerHint(null, "listen")).toBe("listen");
    expect(strongerHint("listen", "show")).toBe("show");
    expect(strongerHint("show", "listen")).toBe("show");
  });
});

describe("tileReadingOf", () => {
  test("AH2. 모든 타일에 로마자가 있으면 그 순서대로 읽기를 만든다", () => {
    expect(tileReadingOf(["gam", "sa"], "always")).toEqual({
      values: ["gam", "sa"],
      shown: "always",
    });
  });
  test("AH3. 하나라도 비거나 타일이 없으면 만들지 않는다", () => {
    expect(tileReadingOf(["gam", undefined], "always")).toBeUndefined();
    expect(tileReadingOf(["gam", ""], "review")).toBeUndefined();
    expect(tileReadingOf([], "always")).toBeUndefined();
  });
});

describe("tileRomanizationsShown", () => {
  test("AH4. always는 늘, review는 다시 풀기에서만 보인다", () => {
    const always = { values: ["a"], shown: "always" } as const;
    const review = { values: ["b"], shown: "review" } as const;
    expect(tileRomanizationsShown(always, false)).toEqual(["a"]);
    expect(tileRomanizationsShown(review, false)).toBeNull();
    expect(tileRomanizationsShown(review, true)).toEqual(["b"]);
    expect(tileRomanizationsShown(undefined, true)).toBeNull();
  });
});
