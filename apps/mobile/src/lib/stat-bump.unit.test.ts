import { describe, expect, test } from "vitest";

import { clearStatBump, noStatBumps, recordStatBump, statBumpStart } from "./stat-bump";

// `unit` 계층: 지표 칩 오름 표식의 순수 함수(ADR-0064).

describe("recordStatBump", () => {
  test("SB1. 오르면 오르기 전 값을 남긴다", () => {
    expect(recordStatBump(noStatBumps, "streak", 3, 4)).toEqual({ streak: 3, trophy: null });
    expect(recordStatBump(noStatBumps, "trophy", 1, 2)).toEqual({ streak: null, trophy: 1 });
  });

  test("SB2. 오르지 않았으면(같거나 내려갔으면) 같은 객체를 돌려준다", () => {
    expect(recordStatBump(noStatBumps, "streak", 4, 4)).toBe(noStatBumps);
    expect(recordStatBump(noStatBumps, "streak", 4, 1)).toBe(noStatBumps);
  });

  test("SB3. 재생 전 표식이 있으면 더 오래된 값을 지킨다", () => {
    const once = recordStatBump(noStatBumps, "trophy", 1, 2);
    expect(recordStatBump(once, "trophy", 2, 3)).toBe(once);
  });
});

describe("clearStatBump", () => {
  test("SB4. 그 칩의 표식만 지운다", () => {
    expect(clearStatBump({ streak: 3, trophy: 1 }, "streak")).toEqual({ streak: null, trophy: 1 });
  });

  test("SB5. 이미 없으면 같은 객체다", () => {
    expect(clearStatBump(noStatBumps, "trophy")).toBe(noStatBumps);
  });
});

describe("statBumpStart", () => {
  test("SB6. 표식이 지금 값보다 작을 때만 시작 값이다", () => {
    expect(statBumpStart(3, 4)).toBe(3);
    expect(statBumpStart(4, 4)).toBeNull();
    expect(statBumpStart(5, 4)).toBeNull();
    expect(statBumpStart(null, 4)).toBeNull();
  });
});
