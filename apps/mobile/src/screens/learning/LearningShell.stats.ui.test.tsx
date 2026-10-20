import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 학습 중에는 상단 줄(연속 학습 · 트로피 칩 · 알림 버튼)이 서지 않는다 — 칩은 결과
// 화면(PERFECT LESSON 등)에서 다시 선다. 머리에는 세션 헤더(`×` · 진행)만 남는다.
afterEach(cleanup);

test("학습 껍데기에는 연속 학습 · 트로피 칩과 알림 버튼이 없다", () => {
  render(
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text>카드 안</text>}
      actionLabel="Check"
      onAction={() => {}}
    />,
  );

  expect(screen.queryByTestId("top-bar-streak")).toBeNull();
  expect(screen.queryByTestId("top-bar-trophy")).toBeNull();
  expect(screen.queryByTestId("top-bar-notifications")).toBeNull();
  expect(screen.getByTestId("learning-shell")).toBeInTheDocument();
});
