import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 학습 문항 안내가 위를 덮는 동안 껍데기 루트를 낭독에서 가리는 `obscured`.
// 닫히면 속성을 떼지 않고 `false`를 씁니다(복원이 보장되는 쪽). 넘기지 않으면 속성이 없습니다.

afterEach(cleanup);

function shell(obscured?: boolean) {
  return (
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={1}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text>카드 안</text>}
      {...(obscured === undefined ? {} : { obscured })}
    />
  );
}

test("[OB1] obscured={true}면 루트가 낭독에서 가려지고, {false}면 false가 쓰인다", () => {
  const view = render(shell(true));
  expect(screen.getByTestId("learning-shell")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  view.rerender(shell(false));
  expect(screen.getByTestId("learning-shell")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

test("[OB2] obscured를 넘기지 않으면 그 속성이 없다", () => {
  render(shell());

  expect(screen.getByTestId("learning-shell")).not.toHaveAttribute("accessibility-elements-hidden");
});
