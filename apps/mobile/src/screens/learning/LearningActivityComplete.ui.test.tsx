import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { LearningActivityComplete } from "./LearningActivityComplete";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

test("한 문항 완료를 단수로 안내하고 정확도나 보상을 만들어 내지 않는다", () => {
  render(<LearningActivityComplete questionCount={1} testId="complete" />);
  expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent(
    "1 of 1 question completed",
  );
  expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent("All questions done");
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
});

test("문항이 없으면 완료 문항 수 요약을 표시하지 않는다", () => {
  render(<LearningActivityComplete questionCount={0} testId="complete" />);
  expect(screen.getByTestId("learning-activity-complete")).not.toHaveTextContent("0 of 0");
});

test("완료 제목·설명·요약은 주입한 문구표를 사용한다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LearningActivityComplete questionCount={3} testId="complete" />
    </UiCopyContext.Provider>,
  );
  expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent(
    "⟦common.allQuestionsDone⟧",
  );
  expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent(
    "⟦learningShell.completionDescription⟧",
  );
  expect(screen.getByTestId("learning-activity-complete")).toHaveTextContent(
    "⟦learningShell.completedQuestions⟧(3)",
  );
});
