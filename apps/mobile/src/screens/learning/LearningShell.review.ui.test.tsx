import type { ReactNode } from "@lynx-js/react";
import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LearningShell } from "./LearningShell";
import { LearningReviewContext } from "./learning-review";
import type { LearningReview } from "./learning-review";
import type { LearningShellFeedback, LearningShellProps } from "./learning-shell-props";
import { lessonReviewBadgeExitAtMs, lessonReviewBadgeGoneAtMs } from "./LessonReviewBadge";

// `ui` 계층: 틀린 문제 다시 풀기(2026-10-23) 동안의 껍데기 — 세션 헤더 변형(Review i / k · 연한 주황 · try again),
// 맞혔을 때의 「Fixed it!」 판(넘김 대신 Continue), 시작 배지(글 · 한 번 재생 · 터치 통과 · 움직임 줄이기)를 봅니다.

const review: LearningReview = { ordinal: 2, total: 3, fixedCount: 1, introCount: null };

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
  // 헤더에 배지 · 칩을 더 세우지 않습니다.
  expect(screen.queryByTestId("lesson-review-badge")).not.toBeInTheDocument();
});

test("RS3. 아직 아무것도 못 고쳤으면 막대 채움이 서지 않는다", () => {
  renderShell({}, { ordinal: 1, total: 2, fixedCount: 0, introCount: null });
  expect(screen.getByTestId("learning-shell-progress")).toHaveAttribute("data-progress", "0");
  expect(screen.queryByTestId("learning-shell-progress-fill")).not.toBeInTheDocument();
});

test("RS4. 맞히면 판정 배지 · 저절로 넘김 대신 Fixed it! 판과 ui-lynx Continue가 서고, 누르면 넘김 걸음을 밟는다", () => {
  vi.useFakeTimers();
  const run = vi.fn<() => void>();
  renderShell({ verdict: "correct", advance: { label: "Continue", run, delayMs: 2500 } });

  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveAttribute("data-tone", "correct");
  expect(within(panel).getByTestId("learning-shell-feedback-body")).toHaveAttribute(
    "accessibility-label",
    "Fixed it!",
  );
  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
  // 저절로 넘어가지 않습니다 — Continue를 기다립니다.
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(run).not.toHaveBeenCalled();

  const continueSlot = within(panel).getByTestId("learning-shell-fixed-continue");
  const button = within(continueSlot).getByTestId("ui-lynx-button");
  expect(button).toHaveTextContent("Continue");
  fireEvent.tap(button, {});
  expect(run).toHaveBeenCalledTimes(1);
});

test("RS5. 카드 안에서 판정하는 활동(result)도 맞히면 Fixed it!이고 Continue가 아래 버튼 동작을 부른다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ result: "correct", actionLabel: "Next", onAction });
  expect(screen.getByTestId("learning-shell-feedback-body")).toHaveTextContent("Fixed it!");
  fireEvent.tap(
    within(screen.getByTestId("learning-shell-fixed-continue")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("RS6. 또 틀리면 지금 모습 그대로다 — Fixed it! 판 없이 배지와 넘김이 선다", () => {
  const feedback: LearningShellFeedback = { tone: "incorrect", title: "Not quite", lines: [] };
  renderShell({
    verdict: "incorrect",
    advance: { label: "Continue", run: () => {}, delayMs: 2500 },
  });
  expect(screen.queryByTestId("learning-shell-feedback")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();

  renderShell({ feedback, actionLabel: "Continue", onAction: () => {} });
  expect(screen.getAllByTestId("learning-shell-feedback-body")[0]).toHaveTextContent("Not quite");
});

test("RS7. 다시 풀기가 아니면 맞혀도 Fixed it! 판이 없다", () => {
  renderShell(
    { verdict: "correct", advance: { label: "Continue", run: () => {}, delayMs: 2500 } },
    null,
  );
  expect(screen.queryByTestId("learning-shell-feedback")).not.toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-advance")).toBeInTheDocument();
});

test("RS8. 첫 화면의 시작 배지: Let’s fix n mistakes · 터치 통과 · 한 번 재생 뒤 걷힘", () => {
  vi.useFakeTimers();
  renderShell({}, { ordinal: 1, total: 2, fixedCount: 0, introCount: 2 });

  const badge = screen.getByTestId("lesson-review-badge");
  expect(badge).toHaveTextContent("Let’s fix 2 mistakes");
  expect(badge).toHaveAttribute("data-phase", "enter");
  expect(badge).toHaveClass("lesson-review-badge-enter");
  expect(screen.getByTestId("lesson-review-badge-layer")).toHaveAttribute(
    "user-interaction-enabled",
    "false",
  );

  act(() => {
    vi.advanceTimersByTime(lessonReviewBadgeExitAtMs);
  });
  expect(screen.getByTestId("lesson-review-badge")).toHaveClass("lesson-review-badge-exit");
  act(() => {
    vi.advanceTimersByTime(lessonReviewBadgeGoneAtMs - lessonReviewBadgeExitAtMs);
  });
  expect(screen.queryByTestId("lesson-review-badge")).not.toBeInTheDocument();
  expect(lessonReviewBadgeGoneAtMs).toBeGreaterThanOrEqual(1600);
  expect(lessonReviewBadgeGoneAtMs).toBeLessThanOrEqual(2000);
});

test("RS9. 틀린 문항이 하나면 단수(mistake)다", () => {
  renderShell({}, { ordinal: 1, total: 1, fixedCount: 0, introCount: 1 });
  expect(screen.getByTestId("lesson-review-badge")).toHaveTextContent("Let’s fix 1 mistake");
});

test("RS10. 움직임 줄이기에서는 배지가 크기 · 이동 없는 페이드 클래스만 얻는다", () => {
  vi.useFakeTimers();
  renderShell({}, { ordinal: 1, total: 2, fixedCount: 0, introCount: 2 }, (node) => (
    <MotionProvider motion="reduced">{node}</MotionProvider>
  ));
  const badge = screen.getByTestId("lesson-review-badge");
  expect(badge).toHaveAttribute("data-motion", "reduced");
  expect(badge).toHaveClass("lesson-review-badge-enter-reduced");
  expect(badge).not.toHaveClass("lesson-review-badge-enter");
  act(() => {
    vi.advanceTimersByTime(lessonReviewBadgeExitAtMs);
  });
  expect(screen.getByTestId("lesson-review-badge")).toHaveClass("lesson-review-badge-exit-reduced");
});

test("RS11. 시작 배지는 서는 순간 같은 글을 한 번 낭독한다", () => {
  const accessibilityAnnounce = vi.fn<(options: { content: string }, done: () => void) => void>();
  vi.stubGlobal("NativeModules", { LynxAccessibilityModule: { accessibilityAnnounce } });
  try {
    renderShell({}, { ordinal: 1, total: 3, fixedCount: 0, introCount: 3 });
    expect(accessibilityAnnounce).toHaveBeenCalledWith(
      { content: "Let’s fix 3 mistakes" },
      expect.any(Function),
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
