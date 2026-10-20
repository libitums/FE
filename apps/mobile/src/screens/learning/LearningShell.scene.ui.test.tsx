import type { ReactNode } from "@lynx-js/react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { learningShellScrollId } from "./learning-shell-scroll";

// `ui` 계층: 완료 장면에서 껍데기가 세 배치(나뉜 · 합친 · 카드 스크롤)에 장면 클래스와
// `data-scene`을 실제로 붙이는지, 문항 장면은 그대로인지 봅니다. 가운데에 그려지는지는 이 계층이
// 못 봅니다(e2e의 몫). 클래스는 `getAttribute("class")` 문자열로 봅니다(LST1 · MG4 관례).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

type ShellProps = Parameters<typeof LearningShell>[0];

const workspace = <text data-testid="fixture-workspace">낱말</text>;

function shellElement(overrides: Partial<ShellProps> = {}): ReactNode {
  return (
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      workspace={workspace}
      actionLabel="Check"
      onAction={() => {}}
      {...overrides}
    />
  );
}

function renderShell(overrides: Partial<ShellProps> = {}) {
  const view = render(shellElement(overrides));
  return {
    ...view,
    again: (next: Partial<ShellProps>) => view.rerender(shellElement({ ...overrides, ...next })),
  };
}

function scrollRef(): unknown {
  return lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
}

function reportHeight(ref: unknown, height: number): void {
  act(() => {
    fireEvent.layoutchange(ref as Element, { detail: { height } });
  });
}

function advanceBy(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const byId = (testId: string): HTMLElement => screen.getByTestId(testId);
const classOf = (testId: string): string => byId(testId).getAttribute("class") ?? "";
const STAGE = "learning-shell-stage";

const completeProps: Partial<ShellProps> = {
  questionIndex: 3,
  complete: true,
  workspace: undefined,
};

/** 전환(300ms)이 끝난 idle까지 시간을 밉니다. */
function settle(): void {
  advanceBy(0);
  advanceBy(300);
}

test("[LSC1] 나뉜 배치의 완료 장면: 무대가 남는 세로를 받고 버튼 행은 떠 있다", () => {
  vi.useFakeTimers();
  renderShell({ ...completeProps });
  settle();

  expect(byId(STAGE).getAttribute("data-scene")).toBe("complete");
  expect(classOf(STAGE)).toBe(
    "learning-shell-stage learning-shell-stage-scene-complete learning-shell-stage-fill-rest",
  );
  expect(screen.queryByTestId("learning-shell-scroll")).toBeNull();
  expect(classOf("learning-shell-actions")).toBe("learning-shell-actions");
  expect(screen.getAllByTestId("ui-lynx-fog")).toHaveLength(1);
});

test("[LSC2] 카드 스크롤의 완료 장면: 스크롤 안의 무대가 스크롤 높이를 하한으로 받는다", () => {
  vi.useFakeTimers();
  renderShell({ ...completeProps, scrollCard: true });
  settle();

  expect(byId(STAGE).getAttribute("data-scene")).toBe("complete");
  expect(classOf(STAGE)).toBe(
    "learning-shell-stage learning-shell-stage-scene-complete learning-shell-stage-fill-scroll",
  );
  expect(byId("learning-shell-scroll").contains(byId(STAGE))).toBe(true);
});

test("[LSC3] 합친 흐름의 완료 장면: 흐름 상자와 무대가 채우고 스크롤 · 흐름 노드는 그대로다", () => {
  vi.useFakeTimers();
  const { again } = renderShell({ questionIndex: 3 });
  reportHeight(scrollRef(), 0);
  settle();
  const scrollNode = byId("learning-shell-scroll");
  const flowNode = byId("learning-shell-flow");

  again({ ...completeProps });
  settle();

  expect(classOf("learning-shell-flow")).toBe(
    "learning-shell-flow learning-shell-flow-fill-scroll",
  );
  expect(classOf(STAGE)).toBe(
    "learning-shell-stage learning-shell-stage-scene-complete learning-shell-stage-fill-flow",
  );
  expect(byId(STAGE).getAttribute("data-scene")).toBe("complete");
  expect(byId("learning-shell-scroll")).toBe(scrollNode);
  expect(byId("learning-shell-flow")).toBe(flowNode);
});

test("[LSC4] 문항 장면은 세 배치 모두 그대로다 — data-scene 없음, 기본 클래스", () => {
  vi.useFakeTimers();

  const split = renderShell();
  settle();
  expect(byId(STAGE).hasAttribute("data-scene")).toBe(false);
  expect(classOf(STAGE)).toBe("learning-shell-stage");
  expect(classOf("learning-shell-actions")).toBe("learning-shell-actions");
  split.unmount();

  const cardScroll = renderShell({ scrollCard: true });
  settle();
  expect(byId(STAGE).hasAttribute("data-scene")).toBe(false);
  expect(classOf(STAGE)).toBe("learning-shell-stage");
  expect(classOf("learning-shell-actions")).toBe(
    "learning-shell-actions learning-shell-actions-in-flow",
  );
  cardScroll.unmount();

  renderShell();
  reportHeight(scrollRef(), 0);
  settle();
  expect(byId(STAGE).hasAttribute("data-scene")).toBe(false);
  expect(classOf(STAGE)).toBe("learning-shell-stage");
  expect(classOf("learning-shell-flow")).toBe("learning-shell-flow");
  expect(classOf("learning-shell-actions")).toBe(
    "learning-shell-actions learning-shell-actions-in-flow",
  );
});

test("[LSC5] 나뉜 배치에서 완료가 오면 전환 클래스가 장면 클래스 뒤에 붙는다", () => {
  vi.useFakeTimers();
  const { again } = renderShell({ questionIndex: 3 });
  settle();

  again({ ...completeProps });

  expect(classOf(STAGE)).toBe(
    "learning-shell-stage learning-shell-stage-scene-complete learning-shell-stage-fill-rest learning-shell-stage-page-primed",
  );
  expect(byId(STAGE).getAttribute("data-page")).toBe("primed");
  expect(byId(STAGE).getAttribute("data-scene")).toBe("complete");
});
