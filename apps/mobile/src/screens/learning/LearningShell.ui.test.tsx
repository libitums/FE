import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다 (docs/conventions/code.md).
function renderShell(overrides: Partial<Parameters<typeof LearningShell>[0]> = {}) {
  return render(
    <LearningShell
      form="listening"
      activityIndex={1}
      totalActivityCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Check"
      onAction={() => {}}
      {...overrides}
    />,
  );
}

test("세션 헤더가 순번 · 학습형 · 백분율을 낸다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Chapter 2 / 4");
  expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("Listening");
  expect(screen.getByTestId("learning-shell-percent")).toHaveTextContent("25%");
});

// 막대는 값이라 낱말 둘을 한 접근성 요소로 묶어 읽히게 합니다.
test("진행이 하나의 접근성 요소로 이름을 낸다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-progress")).toHaveAttribute(
    "accessibility-label",
    "Listening, 활동 4개 중 2번째",
  );
});

test("첫 활동에서는 채움 막대를 그리지 않는다", () => {
  renderShell({ activityIndex: 0 });

  expect(screen.queryByTestId("learning-shell-progress-fill")).not.toBeInTheDocument();
});

// 껍데기는 카드 안에 무엇이 서는지 모릅니다 — 받은 것을 그 자리에 그릴 뿐입니다.
test("카드로 받은 것이 카드 안에 선다", () => {
  renderShell();

  const card = screen.getByTestId("learning-shell-card");

  expect(within(card).getByTestId("fixture-card")).toBeInTheDocument();
});

test("작업 영역은 받았을 때만 선다", () => {
  renderShell();
  expect(screen.queryByTestId("learning-shell-workspace")).not.toBeInTheDocument();
});

test("작업 영역을 받으면 그 안에 그린다", () => {
  renderShell({ workspace: <text data-testid="fixture-workspace">낱말</text> });

  const workspace = screen.getByTestId("learning-shell-workspace");

  expect(within(workspace).getByTestId("fixture-workspace")).toBeInTheDocument();
});

test("나가기가 접근성 속성을 갖고 tap하면 onExit이 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderShell({ onExit });

  const exit = screen.getByTestId("learning-shell-exit");
  expect(exit).toHaveAttribute("accessibility-label", "학습 나가기");
  expect(exit).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(exit, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("아래 버튼이 라벨을 이름과 글자 둘 다로 내고 tap하면 onAction이 한 번 불린다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ onAction });

  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", "Check");
  expect(action).toHaveTextContent("Check");

  fireEvent.tap(action, {});

  expect(onAction).toHaveBeenCalledTimes(1);
});

// 나가기와 아래 버튼은 서로의 콜백을 부르지 않습니다.
test("나가기를 tap해도 onAction은 불리지 않는다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ onAction });

  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});

  expect(onAction).not.toHaveBeenCalled();
});

// DOM 순서가 곧 낭독 순서입니다.
test("DOM 순서 — 세션 헤더 → 지시문 → 카드 → 버튼", () => {
  const { container } = renderShell();

  const order = [...container.querySelectorAll("[data-testid]")]
    .map((el) => el.getAttribute("data-testid"))
    .filter((id) =>
      [
        "learning-shell-session",
        "learning-shell-instruction",
        "learning-shell-card",
        "learning-shell-action",
      ].includes(id ?? ""),
    );

  expect(order).toEqual([
    "learning-shell-session",
    "learning-shell-instruction",
    "learning-shell-card",
    "learning-shell-action",
  ]);
});
