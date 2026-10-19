import { expect, test } from "vitest";
import { render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 껍데기의 무대 변형(`stage`). 기본(`card`)은 무대를 ui-lynx `Card`로 감싸고, `bare`는 활동이 준
// 내용을 무대 상자에 그대로 놓는다 — 문화 카드 덱처럼 면 · 그림자를 스스로 그리는 활동의 자리다.

function renderShell(stage?: "card" | "bare") {
  render(
    <LearningShell
      form="culture-card"
      questionIndex={0}
      questionCount={2}
      instruction="Learn about life in Korea."
      onExit={() => {}}
      card={<view data-testid="fixture-card" />}
      actionLabel="Flip card"
      onAction={() => {}}
      scrollCard
      {...(stage === undefined ? {} : { stage })}
    />,
  );
}

const stage = () => screen.getByTestId("learning-shell-stage");

test("LSS1. 기본 무대는 ui-lynx Card 안에 내용을 둔다", () => {
  renderShell();

  expect(within(stage()).getByTestId("ui-lynx-card")).toBeInTheDocument();
  expect(within(stage()).getByTestId("fixture-card")).toBeInTheDocument();
});

test("LSS2. stage=bare는 Card 없이 무대 상자의 바로 아래에 내용을 둔다", () => {
  renderShell("bare");

  // 세션 헤더도 ui-lynx Card라 무대 안만 셉니다.
  expect(within(stage()).queryByTestId("ui-lynx-card")).not.toBeInTheDocument();
  expect(screen.getByTestId("fixture-card").parentElement).toBe(stage());
  expect(stage()).toHaveAttribute("class", "learning-shell-stage");
});

test("LSS3. stage=card를 밝혀 적어도 기본과 같다", () => {
  renderShell("card");

  expect(within(stage()).getByTestId("ui-lynx-card")).toBeInTheDocument();
});
