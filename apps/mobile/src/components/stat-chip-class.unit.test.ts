import { describe, expect, it } from "vitest";

import { statChipClassName } from "./stat-chip-class";
import type { StatChipHeight, StatChipSurface } from "./stat-chip-class";

// `unit` 계층: 칩의 면 × 높이 → 클래스 문자열 (순수 함수).

describe("statChipClassName", () => {
  const cases: readonly (readonly [StatChipSurface, StatChipHeight, string])[] = [
    ["none", "hug", "stat-chip"],
    ["white", "hug", "stat-chip stat-chip-surface-white"],
    ["none", "touch-target", "stat-chip stat-chip-height-touch-target"],
    ["white", "touch-target", "stat-chip stat-chip-surface-white stat-chip-height-touch-target"],
  ];

  it.each(cases)("[SCC1] (%s, %s) → %s", (surface, height, expected) => {
    expect(statChipClassName(surface, height)).toBe(expected);
  });

  it.each(cases)(
    "[SCC2] (%s, %s) 결과에 빈 토큰이 없고 같은 입력은 같은 값이다",
    (surface, height) => {
      const className = statChipClassName(surface, height);

      expect(className.split(" ").every((token) => token.length > 0)).toBe(true);
      expect(statChipClassName(surface, height)).toBe(className);
    },
  );
});
