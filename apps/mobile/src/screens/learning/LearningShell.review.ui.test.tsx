import type { ReactNode } from "@lynx-js/react";
import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LearningShell } from "./LearningShell";
import { LearningReviewContext } from "./learning-review";
import type { LearningReview } from "./learning-review";
import type { LearningShellFeedback, LearningShellProps } from "./learning-shell-props";

// `ui` 계층: 틀린 문제 다시 도전(ADR-0058 ⟨2026-10-30⟩) 동안의 껍데기 — 세션 헤더 변형(Review i / n · 연한 주황 ·
// try again · 칩), 판정 뒤 아래 판(맞힘 초록 Fixed it! · 틀림 빨강 Not quite)과 판 안 Continue를 봅니다.

const review: LearningReview = {
  ordinal: 2,
  total: 3,
  fixedCount: 1,
  remainingToPass: 1,
};

afterEach(() => {
  vi.useRealTimers();
});

function renderShell(
  overrides: Partial<LearningShellProps> = {},
  value: LearningReview | null = review,
  wrap: (node: ReactNode) => ReactNode = (node) => node,
) {
  return render(
    <>
      {wrap(
        <LearningReviewContext.Provider value={value}>
          <LearningShell
            form="word-choice"
            questionIndex={0}
            questionCount={1}
            instruction="What do you say?"
            onExit={() => {}}
            card={<text data-testid="fixture-card">카드 안</text>}
            {...overrides}
          />
        </LearningReviewContext.Provider>,
      )}
    </>,
  );
}

test("RS1. 다시 풀기가 아니면 헤더는 Lesson n / N 그대로이고 변형 표식이 없다", () => {
  renderShell({}, null);
  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 1");
  expect(screen.getByTestId("learning-shell-session-layer")).not.toHaveAttribute("data-review");
  expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("Word choice");
});

test("RS2. 다시 풀기 헤더: Review i / k(브랜드 강조) · 연한 주황 층 · try again 꼬리 · 막대는 고친 몫", () => {
  renderShell();
  const layer = screen.getByTestId("learning-shell-session-layer");
  expect(layer).toHaveAttribute("data-review", "true");
  expect(layer).toHaveClass("learning-shell-session-layer-review");
  const chapter = screen.getByTestId("learning-shell-chapter");
  expect(chapter).toHaveTextContent("Review 2 / 3");
  expect(chapter).toHaveClass("learning-shell-progress-label-review");
  expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("Word choice · try again");
  const progress = screen.getByTestId("learning-shell-progress");
  expect(Number(progress.getAttribute("data-progress"))).toBeCloseTo(100 / 3);
  expect(progress).toHaveAttribute("accessibility-label", "Word choice, review 2 of 3");
  // 이름표 줄 오른쪽에 남은 필요 수 칩이 섭니다.
  const chip = screen.getByTestId("learning-shell-review-chip");
  expect(chip).toHaveTextContent("1 more to pass");
  expect(chip).not.toHaveAttribute("data-unlocked");
});

test("RS3. 아직 아무것도 못 고쳤으면 막대 채움이 서지 않는다", () => {
  renderShell({}, { ordinal: 1, total: 2, fixedCount: 0, remainingToPass: 1 });
  expect(screen.getByTestId("learning-shell-progress")).toHaveAttribute("data-progress", "0");
  expect(screen.queryByTestId("learning-shell-progress-fill")).not.toBeInTheDocument();
});

function continueIn(panel: HTMLElement) {
  return within(within(panel).getByTestId("learning-shell-review-continue")).getByTestId(
    "ui-lynx-button",
  );
}

test("RS4. 맞히면 배지 · 저절로 넘김 대신 초록 Fixed it! 판과 ui-lynx Continue가 서고, 누르면 넘김 걸음을 밟는다", () => {
  vi.useFakeTimers();
  const run = vi.fn<() => void>();
  renderShell({ verdict: "correct", advance: { label: "Continue", run, delayMs: 2500 } });
  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveAttribute("data-tone", "correct");
  expect(within(panel).getByTestId("learning-shell-feedback-body")).toHaveTextContent("Fixed it!");
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(run).not.toHaveBeenCalled();
  fireEvent.tap(continueIn(panel), {});
  expect(run).toHaveBeenCalledTimes(1);
});

test("RS5. 또 틀리면 빨간 Not quite 판이 서고 Continue가 아래 버튼 동작(Next)을 부른다", () => {
  const next = vi.fn<() => void>();
  renderShell({ verdict: "incorrect", actionLabel: "Next", onAction: next });
  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveAttribute("data-tone", "incorrect");
  expect(panel).toHaveTextContent("Not quite");
  expect(panel).toHaveTextContent("No worries");
  fireEvent.tap(continueIn(panel), {});
  expect(next).toHaveBeenCalledTimes(1);
});

test("RS6. 카드 안에서 판정하는 활동(result)도 판이 서고, 해설 판을 쓰는 학습형은 맞히면 제목만 Fixed it!이다", () => {
  const one = renderShell({ result: "correct", actionLabel: "Next", onAction: () => {} });
  expect(screen.getByTestId("learning-shell-feedback")).toHaveAttribute("data-tone", "correct");
  one.unmount();
  const feedback: LearningShellFeedback = {
    tone: "correct",
    title: "Correct!",
    lines: [{ text: "설명 줄", lang: "ko" }],
  };
  renderShell({ feedback, actionLabel: "Next", onAction: () => {} });
  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveTextContent("Fixed it!");
  expect(panel).toHaveTextContent("설명 줄");
});

test("RS7. 다시 도전이 아니면 판 없이 지금 모습 그대로다(배지 · 넘김)", () => {
  renderShell(
    { verdict: "correct", advance: { label: "Continue", run: () => {}, delayMs: 2500 } },
    null,
  );
  expect(screen.getByTestId("answer-verdict")).toHaveTextContent("Correct");
  expect(screen.queryByTestId("learning-shell-feedback")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

test("RS8. 다시 풀기가 아니면 칩이 없다", () => {
  renderShell({}, null);
  expect(screen.queryByTestId("learning-shell-review-chip")).not.toBeInTheDocument();
});

test("RS9. 통과선을 넘었으면 칩이 Pass unlocked(표식 data-unlocked)다", () => {
  renderShell({}, { ordinal: 3, total: 3, fixedCount: 2, remainingToPass: 0 });
  const chip = screen.getByTestId("learning-shell-review-chip");
  expect(chip).toHaveTextContent("Pass unlocked");
  expect(chip).toHaveAttribute("data-unlocked", "true");
});

test("RS13. 다시 도전 판은 제자리에 선다 — 미끄러짐 없이(steady) 떠 있는 버튼 자리에 겹쳐 선다", () => {
  renderShell({ verdict: "incorrect", actionLabel: "Next", onAction: () => {} });
  expect(screen.getByTestId("learning-shell-feedback")).toHaveClass(
    "learning-shell-feedback-steady",
  );
  expect(screen.getByTestId("learning-shell-feedback-bleed")).toHaveClass(
    "learning-shell-feedback-bleed-steady",
  );
});

test("RS14. 다시 도전 판이 서면 스크롤 끝에 판 몫의 여유가 붙고, 판이 없으면 없다", () => {
  const workspace = <view data-testid="fixture-workspace" />;
  const one = renderShell({
    verdict: "incorrect",
    actionLabel: "Next",
    onAction: () => {},
    workspace,
  });
  expect(screen.getByTestId("learning-shell-panel-room")).toBeInTheDocument();
  one.unmount();
  renderShell({ workspace });
  expect(screen.queryByTestId("learning-shell-panel-room")).not.toBeInTheDocument();
});
