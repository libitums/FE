import { expect, test, vi } from "vitest";
import { learningPassCriterionForStep } from "./learning-assessment";
import { judgeAssessment } from "../screens/assessment/assessment";
import type { LearningForm } from "../lib/learning-form";

const fixture = vi.hoisted(() => ({ forms: ["sentence-order"] as LearningForm[] }));
vi.mock("../screens/journey-map/journey-map", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../screens/journey-map/journey-map")>()),
  learningFormsForStep: () => fixture.forms,
}));

test("한 문항은 1개 정답으로 통과하며 오답·빈 결과는 통과하지 않는다", () => {
  fixture.forms = ["sentence-order"];
  const criterion = learningPassCriterionForStep("ordering");
  expect(criterion.minCorrectCount).toBe(1);
  expect(judgeAssessment(["correct"], criterion)).toBe("passed");
  expect(judgeAssessment(["incorrect"], criterion)).toBe("failed");
  expect(judgeAssessment([], criterion)).toBe("failed");
});

test("세 문항 활동은 결과가 하나만 돌아와도 기존 2개 정답 기준을 유지한다", () => {
  fixture.forms = ["listening"];
  const criterion = learningPassCriterionForStep("ordering");
  expect(criterion.minCorrectCount).toBe(2);
  expect(judgeAssessment(["correct"], criterion)).toBe("failed");
  expect(judgeAssessment(["correct", "correct", "incorrect"], criterion)).toBe("passed");
});

test("빈 활동은 0개 정답으로 자동 통과하지 않는다", () => {
  fixture.forms = ["writing"];
  const criterion = learningPassCriterionForStep("ordering");
  expect(criterion.minCorrectCount).toBe(1);
  expect(judgeAssessment([], criterion)).toBe("failed");
});
