import { describe, expect, test } from "vitest";

import { getProgressHeaderProgress } from "./contract";

describe("getProgressHeaderProgress", () => {
  test.each([
    [Number.NaN, { value: 0, percentageLabel: "0%", fillPercent: null }],
    [-Infinity, { value: 0, percentageLabel: "0%", fillPercent: null }],
    [-1, { value: 0, percentageLabel: "0%", fillPercent: null }],
    [-0, { value: 0, percentageLabel: "0%", fillPercent: null }],
    [0, { value: 0, percentageLabel: "0%", fillPercent: null }],
    [0.1, { value: 0.1, percentageLabel: "0.1%", fillPercent: 0.1 }],
    [33.5, { value: 33.5, percentageLabel: "33.5%", fillPercent: 33.5 }],
    [100, { value: 100, percentageLabel: "100%", fillPercent: 100 }],
    [101, { value: 100, percentageLabel: "100%", fillPercent: 100 }],
    [Infinity, { value: 100, percentageLabel: "100%", fillPercent: 100 }],
  ] as const)("%s 입력을 0..100 진행률 계약으로 변환한다", (input, expected) => {
    expect(getProgressHeaderProgress(input)).toEqual(expected);
  });

  test("음수 0은 정규화된 양수 0으로 반환한다", () => {
    const result = getProgressHeaderProgress(-0);

    expect(Object.is(result.value, -0)).toBe(false);
    expect(result).toEqual({ value: 0, percentageLabel: "0%", fillPercent: null });
  });

  test("표시 라벨은 clamp된 canonical value를 반올림 없이 사용한다", () => {
    const result = getProgressHeaderProgress(33.5);

    expect(result.percentageLabel).toBe(`${result.value}%`);
    expect(result.fillPercent).toBe(result.value);
  });
});
