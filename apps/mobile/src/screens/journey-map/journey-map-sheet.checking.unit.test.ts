import { describe, expect, test } from "vitest";

import { canOpenStep } from "./journey-map-sheet";
import type { JourneyStepNodeStatus } from "./journey-map-types";

// `unit` 계층: 말풍선을 열 수 있는 스텝 상태 표에 「확인 중」 행이 들어갔는지 봅니다.

describe("ML-S1 canOpenStep", () => {
  test.each([
    ["done", true],
    ["current", true],
    ["locked", false],
    ["checking", false],
  ] as const satisfies readonly (readonly [JourneyStepNodeStatus, boolean])[])(
    "ML-S1. %s -> %s",
    (status, expected) => {
      expect(canOpenStep(status)).toBe(expected);
    },
  );
});
