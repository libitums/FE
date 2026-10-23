import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 보조 버튼이 있는 아래 버튼 행(말하기 화면)만 짝 표시를 받는지 봅니다 — 큰 글자에서 넘치면 위아래로 쌓는
// 규칙(`.learning-shell-actions-paired`)이 그 행에만 걸리고 다른 화면의 행은 그대로입니다(ADR-0020 결정 5).

afterEach(cleanup);

function renderShell(secondary: boolean, scrollCard = false) {
  return render(
    <LearningShell
      form="read-aloud"
      questionIndex={0}
      questionCount={1}
      instruction="Read"
      onExit={() => {}}
      card={<text>card</text>}
      actionLabel="Speak"
      onAction={() => {}}
      scrollCard={scrollCard}
      secondaryAction={secondary ? <view data-testid="fixture-secondary" /> : undefined}
    />,
  );
}

const rowClass = (): string | null =>
  screen.getByTestId("learning-shell-actions").getAttribute("class");

test("[LSA1] 보조 버튼이 있으면 행이 짝 표시를 받고 보조 버튼이 주 버튼 앞에 선다", () => {
  renderShell(true);

  expect(rowClass()).toBe("learning-shell-actions learning-shell-actions-paired");
  const row = screen.getByTestId("learning-shell-actions");
  expect(row.firstElementChild).toBe(screen.getByTestId("fixture-secondary"));
  expect(row.lastElementChild).toBe(screen.getByTestId("learning-shell-action"));
});

test("[LSA2] 흐름 안 행에서도 짝 표시가 함께 붙는다", () => {
  renderShell(true, true);

  expect(rowClass()).toBe(
    "learning-shell-actions learning-shell-actions-in-flow learning-shell-actions-paired",
  );
});

test("[LSA3] 보조 버튼이 없으면 행 클래스가 그대로다", () => {
  renderShell(false);

  expect(rowClass()).toBe("learning-shell-actions");
});
