import type { SpecialUnitStatus } from "@libitums/ui-lynx/special-unit";
import { describe, expect, test } from "vitest";

import { specialUnitMapEn } from "../../lib/ui-copy-en-shell";
import type { JourneyMapNodeStatus } from "./journey-map-types";
import {
  specialUnitLabelToneOf,
  specialUnitMapAccessibilityLabel,
  specialUnitStatusByNodeStatus,
  specialUnitStatusOf,
} from "./journey-special-unit";

const mapStatuses: readonly JourneyMapNodeStatus[] = [
  "locked",
  "checking",
  "available",
  "completed",
];

describe("맵 상태 → 유닛 상태", () => {
  test("JS1. 표는 넷을 한 벌로 옮기고 active를 내지 않는다", () => {
    expect(specialUnitStatusByNodeStatus).toEqual({
      locked: "default",
      checking: "checking",
      available: "available",
      completed: "clear",
    });
    expect(Object.values(specialUnitStatusByNodeStatus)).not.toContain("active");
  });

  test.each(mapStatuses)("JS1. specialUnitStatusOf(%s)는 표와 같다", (status) => {
    expect(specialUnitStatusOf(status)).toBe(specialUnitStatusByNodeStatus[status]);
  });
});

describe("라벨 톤", () => {
  test.each([
    ["default", "muted"],
    ["checking", "muted"],
    ["available", "brand"],
    ["active", "brand"],
    ["clear", "correct"],
  ] as const satisfies readonly (readonly [SpecialUnitStatus, string])[])(
    "JS2. %s는 %s 톤이다",
    (status, tone) => {
      expect(specialUnitLabelToneOf(status)).toBe(tone);
    },
  );
});

describe("맵 낭독 이름", () => {
  test.each([
    ["A Call from Minseo", "special, A Call from Minseo"],
    ["Episode 1. Final test", "special, Episode 1. Final test"],
  ])("JS3. %s -> %s", (name, expected) => {
    expect(specialUnitMapAccessibilityLabel(name, specialUnitMapEn)).toBe(expected);
  });

  test("JS3. 상태 접미사를 붙이지 않는다", () => {
    const label = specialUnitMapAccessibilityLabel("Episode intro", specialUnitMapEn);
    for (const suffix of ["locked", "loading", "current", "completed", "story"]) {
      expect(label).not.toContain(suffix);
    }
  });
});
