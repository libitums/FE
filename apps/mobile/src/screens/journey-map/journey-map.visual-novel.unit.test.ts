import { describe, expect, it } from "vitest";

import {
  initialCompletedStepCount,
  journeyMapItems,
  journeyStepOrdinal,
  journeySteps,
  stepStatusAt,
} from "./journey-map";

describe("journey map visual novel contract", () => {
  it("phone 뒤이자 directions 앞에 visual novel을 한 번 둔다", () => {
    expect(
      journeyMapItems.map((item) =>
        item.kind === "standard" ? `standard:${item.step.id}` : `${item.kind}:${item.id}`,
      ),
    ).toEqual([
      "standard:greeting",
      "standard:introduction",
      "standard:ordering",
      "standard:appointment",
      "special:appointment-confirmation",
      "phone-call:appointment-confirmation-phone-call",
      "visual-novel:cafe-arrival-visual-novel",
      "standard:directions",
    ]);
  });

  it("기존 five standard steps와 ordinal 및 초기 상태는 변하지 않는다", () => {
    expect(journeySteps.map(({ id }) => id)).toEqual([
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "directions",
    ]);
    expect(journeySteps.map(({ id }) => journeyStepOrdinal(id))).toEqual([1, 2, 3, 4, 5]);
    expect(journeySteps.map((_, index) => stepStatusAt(index, initialCompletedStepCount))).toEqual([
      "done",
      "done",
      "current",
      "locked",
      "locked",
    ]);
  });
});
