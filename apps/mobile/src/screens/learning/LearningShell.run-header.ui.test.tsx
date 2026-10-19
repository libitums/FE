import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import type { LearningRunProgress } from "./learning-shell.contract";

// `ui` 계층: 세션 헤더 자리의 갈림 — `runProgress`를 받으면 가벼운 헤더(`×` · 칸 막대 · 캡션)가 서고
// 세션 헤더(`Lesson n / N`)는 없으며, 받지 않으면 세션 헤더 그대로입니다. 아래 버튼 자리에 활동이 세운
// 버튼(`actionButton`)이 서는 것도 봅니다. 렌더 결과와 상호작용만 봅니다(ADR-0006 D4).

afterEach(cleanup);

const progress: LearningRunProgress = {
  segments: ["done", "done", "done", "current", "upcoming", "upcoming", "upcoming"],
  label: "Word 4 of 7",
};

function renderShell(overrides: Partial<Parameters<typeof LearningShell>[0]> = {}) {
  const onExit = vi.fn<() => void>();
  const view = render(
    <LearningShell
      form="vocab-card"
      questionIndex={3}
      questionCount={7}
      instruction="Learn this word."
      onExit={onExit}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Next"
      onAction={() => {}}
      {...overrides}
    />,
  );
  return { onExit, container: view.container };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);

describe("세션 헤더 자리", () => {
  test("LRH1. runProgress가 없으면 세션 헤더가 서고 가벼운 헤더는 없다", () => {
    renderShell({ form: "word-choice", questionIndex: 0, questionCount: 5 });

    expect(id("learning-shell-session")).toBeInTheDocument();
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 5");
    expect(maybe("learning-run-header")).not.toBeInTheDocument();
  });

  test("LRH2. runProgress가 있으면 가벼운 헤더가 서고 세션 헤더 · 순번 · 학습형 이름은 없다", () => {
    renderShell({ runProgress: progress });

    expect(id("learning-run-header")).toBeInTheDocument();
    expect(maybe("learning-shell-session")).not.toBeInTheDocument();
    expect(maybe("learning-shell-chapter")).not.toBeInTheDocument();
    expect(maybe("learning-shell-form")).not.toBeInTheDocument();
    expect(screen.queryByText(/Lesson \d+ \/ \d+/)).toBeNull();
  });

  test("LRH3. 칸은 카드마다 하나이고 상태가 순서대로 done · current · upcoming이다", () => {
    renderShell({ runProgress: progress });

    const segments = [
      ...id("learning-run-header-bar").querySelectorAll(
        '[data-testid^="learning-run-header-segment-"]',
      ),
    ];
    expect(segments.map((segment) => segment.getAttribute("data-state"))).toEqual(
      progress.segments,
    );
  });

  test("LRH4. 캡션 줄 왼쪽에 Word 4 of 7이 서고 다른 낱말(이미 아는 수 등)은 없다", () => {
    renderShell({ runProgress: progress });

    expect(id("learning-run-header-caption")).toHaveTextContent("Word 4 of 7");
    expect(screen.queryByText(/already known/)).toBeNull();
  });

  test("LRH5. 막대는 낭독에서 빠지고 진행 묶음이 같은 이름(Word 4 of 7) 하나로 읽힌다", () => {
    renderShell({ runProgress: progress });

    expect(id("learning-run-header-bar")).toHaveAttribute("accessibility-elements-hidden", "true");
    const group = id("learning-run-header-progress");
    expect(group).toHaveAttribute("accessibility-element", "true");
    expect(group).toHaveAttribute("accessibility-label", "Word 4 of 7");
  });

  test("LRH6. ×는 이름 있는 버튼이고 누르면 확인을 묻고, Leave를 고르면 그때 onExit이 한 번이다", () => {
    const { onExit, container } = renderShell({ runProgress: progress });
    const exit = id("learning-run-header-exit");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-label", "Leave lesson");

    fireEvent.tap(exit, {});
    expect(onExit).not.toHaveBeenCalled();
    const leave = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
      (el) => el.getAttribute("accessibility-label") === "Leave",
    );
    expect(leave).toBeDefined();
    fireEvent.tap(leave as Element, {});

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("LRH7. DOM 순서 — 가벼운 헤더 → 지시문 → 카드", () => {
    const { container } = renderShell({ runProgress: progress });
    const order = [...container.querySelectorAll("[data-testid]")]
      .map((el) => el.getAttribute("data-testid"))
      .filter((testId) =>
        ["learning-run-header", "learning-shell-instruction", "fixture-card"].includes(
          testId ?? "",
        ),
      );

    expect(order).toEqual(["learning-run-header", "learning-shell-instruction", "fixture-card"]);
  });
});

describe("아래 버튼 자리", () => {
  test("LRH8. actionButton을 받으면 그것이 버튼 행에 서고 기본 버튼은 없다", () => {
    renderShell({
      actionLabel: undefined,
      onAction: undefined,
      actionButton: <view data-testid="fixture-button" />,
    });

    expect(within(id("learning-shell-actions")).getByTestId("fixture-button")).toBeInTheDocument();
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();
  });
});
