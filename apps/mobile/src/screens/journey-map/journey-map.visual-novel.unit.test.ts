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
      // 표지가 맨 앞입니다 — 에피소드의 첫 유닛이 서사만을 위한 학습이라서입니다.
      // 이 줄은 메신저 계약 파일의 같은 종류 단언과 **함께 움직입니다**.
      "episode-intro:tutorial-intro",
      "standard:greeting",
      "standard:introduction",
      "standard:ordering",
      "standard:appointment",
      "messenger:appointment-confirmation",
      "phone-call:appointment-confirmation-phone-call",
      "visual-novel:cafe-arrival-visual-novel",
      "standard:directions",
      "standard:tutorial-listening",
      "standard:tutorial-speaking",
      "standard:tutorial-writing",
      "episode-final:tutorial-final-test",
    ]);
  });

  it("CE3 특별 항목 제목이 영어다(부록 C.1)", () => {
    expect(
      journeyMapItems.flatMap((item) => (item.kind === "standard" ? [] : [[item.id, item.title]])),
    ).toEqual([
      ["tutorial-intro", "Episode intro"],
      ["appointment-confirmation", "Appointment message"],
      ["appointment-confirmation-phone-call", "Appointment call"],
      ["cafe-arrival-visual-novel", "Jimin arrives at the café"],
      ["tutorial-final-test", "Final test"],
    ]);
  });

  it("기존 five standard steps와 ordinal 및 초기 상태는 변하지 않는다", () => {
    expect(journeySteps.map(({ id }) => id)).toEqual([
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "directions",
      "tutorial-listening",
      "tutorial-speaking",
      "tutorial-writing",
    ]);
    expect(journeySteps.map(({ id }) => journeyStepOrdinal(id))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(journeySteps.map((_, index) => stepStatusAt(index, initialCompletedStepCount))).toEqual([
      "done",
      "done",
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });
});
