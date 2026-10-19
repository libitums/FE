import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LearningActivityComplete } from "./LearningActivityComplete";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 완료 카드(시안 A — 링 + 체크)의 구조 · 숫자 · 모션 클래스. 곡선 · 첫 프레임은 e2e가 봅니다.

afterEach(() => {
  cleanup();
});

const lesson = { offset: 9, total: 11, last: true, activityCount: 3, ordinal: 3 } as const;
const reduced = (element: ReactNode) => <MotionProvider motion="reduced">{element}</MotionProvider>;
const root = () => screen.getByTestId("learning-activity-complete");
const motionClassCount = () => root().querySelectorAll("[class*='-motion-ring']").length;

test("한 문항 완료를 단수로 낭독하고 정확도나 보상을 만들어 내지 않는다", () => {
  render(<LearningActivityComplete questionCount={1} testId="complete" />);
  expect(root()).toHaveTextContent("All questions done");
  expect(screen.getByTestId("learning-activity-complete-questions")).toHaveAttribute(
    "accessibility-label",
    "1 of 1 question completed",
  );
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
});

test("AC-U1. 링 · 안쪽 원 · 체크가 서고, 장식 묶음은 낭독에서 빠진다", () => {
  render(<LearningActivityComplete questionCount={2} testId="complete" lesson={lesson} />);
  const ring = screen.getByTestId("learning-activity-complete-ring");
  expect(ring).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(ring.querySelector(".learning-activity-complete-ring-track")).not.toBeNull();
  expect(ring.querySelectorAll(".learning-activity-complete-ring-arc")).toHaveLength(2);
  expect(ring.querySelector(".learning-activity-complete-fill")).not.toBeNull();
  expect(screen.getByTestId("learning-activity-complete-icon")).toBeInTheDocument();
});

test("AC-U2. 레슨 안이면 칩 · 문항 타일(레슨 전체) · 활동 타일이 서고 XP는 없다", () => {
  render(<LearningActivityComplete questionCount={2} testId="complete" lesson={lesson} />);
  expect(screen.getByTestId("learning-activity-complete-lesson")).toHaveTextContent("Lesson 3");
  const questions = screen.getByTestId("learning-activity-complete-questions");
  expect(questions).toHaveTextContent("11");
  expect(questions).toHaveTextContent("QUESTIONS");
  expect(questions).toHaveAttribute("accessibility-element", "true");
  expect(questions).toHaveAttribute("accessibility-label", "11 of 11 questions completed");
  const activities = screen.getByTestId("learning-activity-complete-activities");
  expect(activities).toHaveTextContent("3");
  expect(activities).toHaveTextContent("ACTIVITIES");
  expect(activities).toHaveAttribute("accessibility-label", "3 activities completed");
  expect(root()).not.toHaveTextContent(/XP/i);
  expect(screen.getByTestId("learning-activity-complete-stats").children).toHaveLength(2);
});

test("AC-U3. 레슨 밖이면 칩 · 활동 타일 없이 문항 타일 하나만이다 — 모르는 값을 지어내지 않는다", () => {
  render(<LearningActivityComplete questionCount={3} testId="complete" />);
  expect(screen.queryByTestId("learning-activity-complete-lesson")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-activity-complete-activities")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-activity-complete-questions")).toHaveTextContent("3");
});

test("AC-U4. 레슨이 순번 · 활동 수를 모르면 칩 · 활동 타일이 없다", () => {
  render(
    <LearningActivityComplete
      questionCount={2}
      testId="complete"
      lesson={{ offset: 0, total: 2, last: true }}
    />,
  );
  expect(screen.queryByTestId("learning-activity-complete-lesson")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-activity-complete-activities")).not.toBeInTheDocument();
});

test("문항이 없으면 완료 문항 수 타일을 표시하지 않는다", () => {
  render(<LearningActivityComplete questionCount={0} testId="complete" />);
  expect(screen.queryByTestId("learning-activity-complete-questions")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-activity-complete-stats")).not.toBeInTheDocument();
});

test("AC-U5. 표준 움직임이면 링 두 반쪽 · 안쪽 원 · 체크 · 올라옴에 모션 클래스가 선다", () => {
  render(<LearningActivityComplete questionCount={2} testId="complete" lesson={lesson} />);
  for (const part of ["ring-right", "ring-left", "fill", "check"]) {
    expect(
      root().querySelector(`.learning-activity-complete-${part}-motion-ring`),
      part,
    ).not.toBeNull();
  }
  // 제목 묶음과 숫자 타일 줄이 함께 올라옵니다.
  expect(root().querySelectorAll(".learning-activity-complete-rise-motion-ring")).toHaveLength(2);
  expect(root()).not.toHaveAttribute("data-motion");
});

test("AC-U6. 움직임 줄이기면 모션 클래스가 하나도 없이 끝 모습이 바로 선다", () => {
  render(reduced(<LearningActivityComplete questionCount={2} testId="complete" lesson={lesson} />));
  expect(motionClassCount()).toBe(0);
  expect(root()).toHaveAttribute("data-motion", "reduced");
  // 끝 모습의 구성은 표준과 같습니다 — 링 · 체크 · 숫자가 그대로 섭니다.
  expect(root().querySelectorAll(".learning-activity-complete-ring-arc")).toHaveLength(2);
  expect(screen.getByTestId("learning-activity-complete-icon")).toBeInTheDocument();
  expect(screen.getByTestId("learning-activity-complete-questions")).toHaveTextContent("11");
});

test("완료 제목 · 설명 · 칩 · 타일은 주입한 문구표를 사용한다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LearningActivityComplete questionCount={3} testId="complete" lesson={lesson} />
    </UiCopyContext.Provider>,
  );
  expect(root()).toHaveTextContent("⟦common.allQuestionsDone⟧");
  expect(root()).toHaveTextContent("⟦learningShell.completionDescription⟧");
  expect(root()).toHaveTextContent("⟦catalogMap.lessonTitle⟧(3)");
  expect(root()).toHaveTextContent("⟦learningShell.completionStats.questions⟧");
  expect(root()).toHaveTextContent("⟦learningShell.completionStats.activities⟧");
  expect(screen.getByTestId("learning-activity-complete-questions")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.completedQuestions⟧(11)",
  );
  expect(screen.getByTestId("learning-activity-complete-activities")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.completedActivities⟧(3)",
  );
});
