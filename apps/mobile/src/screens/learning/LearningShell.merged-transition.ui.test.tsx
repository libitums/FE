import type { ReactNode } from "@lynx-js/react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { LearningShell } from "./LearningShell";
import { learningShellScrollId } from "./learning-shell-scroll";

// `ui` 계층: 합친 흐름(`merged`)에서 문항 전환을 누가 지는가를 봅니다. 나뉜 배치와 카드 스크롤의
// 전환은 `LearningShell.ui.test.tsx`(LST)가 보고, 여기는 두 기능이 만나는 자리입니다 — 바깥
// 합친 스크롤이 전환을 지고 흐름 안의 무대 · 작업 영역 · 지시문에는 걸리지 않습니다. 곡선 · 실제
// 불투명도 · 맨 위 스크롤과 전환이 겹치는 프레임은 기기 확인의 몫입니다.

type ShellProps = Parameters<typeof LearningShell>[0];

const workspace = <text data-testid="fixture-workspace">낱말</text>;
const noAction = { actionLabel: undefined, onAction: undefined } as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function shellElement(overrides: Partial<ShellProps>, reduced: boolean): ReactNode {
  const shell = (
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      workspace={workspace}
      {...noAction}
      {...overrides}
    />
  );
  return reduced ? <MotionProvider motion="reduced">{shell}</MotionProvider> : shell;
}

/** 합친 흐름으로 세운 뒤 문항을 바꿀 수 있는 렌더입니다. */
function renderMerged(reduced = false) {
  const view = render(shellElement({}, reduced));
  const ref = lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height: 0 } });
  });
  expect(screen.queryByTestId("learning-shell-flow")).not.toBeNull();
  return {
    update: (next: Partial<ShellProps>) => view.rerender(shellElement(next, reduced)),
  };
}

function advanceBy(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const byId = (testId: string): HTMLElement => screen.getByTestId(testId);

test("[MT1] 합친 흐름: 문항이 바뀌면 바깥 합친 스크롤이 전환을 지고 안쪽 무대 · 지시문에는 걸리지 않는다", () => {
  vi.useFakeTimers();
  const { update } = renderMerged();
  expect(byId("learning-shell-scroll").getAttribute("class")).toBe(
    "learning-shell-scroll learning-shell-card-scroll learning-shell-body-scroll",
  );

  update({ questionIndex: 1 });

  const scroll = byId("learning-shell-scroll");
  expect(scroll).toHaveAttribute("data-page", "primed");
  expect(scroll.getAttribute("class")).toBe(
    "learning-shell-scroll learning-shell-card-scroll learning-shell-body-scroll learning-shell-scroll-page-primed",
  );
  expect(scroll.contains(byId("learning-shell-stage"))).toBe(true);
  expect(byId("learning-shell-stage")).not.toHaveAttribute("data-page");
  expect(byId("learning-shell-stage").getAttribute("class")).toBe("learning-shell-stage");
  expect(byId("learning-shell-instruction")).not.toHaveAttribute("data-page");
  expect(byId("learning-shell")).not.toHaveAttribute("data-page");
});

test("[MT2] 합친 흐름: primed → entering → 300ms 뒤 idle로 클래스가 base로 돌아온다", () => {
  vi.useFakeTimers();
  const { update } = renderMerged();
  update({ questionIndex: 1 });

  advanceBy(0);
  expect(byId("learning-shell-scroll")).toHaveAttribute("data-page", "entering");
  expect(byId("learning-shell-scroll").getAttribute("class")).toContain(
    "learning-shell-scroll-page-entering",
  );

  advanceBy(300);
  expect(byId("learning-shell-scroll").getAttribute("class")).toBe(
    "learning-shell-scroll learning-shell-card-scroll learning-shell-body-scroll",
  );
});

test("[MT3] 합친 흐름 · reduced: 합친 스크롤에 data-motion=reduced와 -motion-reduced가 붙는다", () => {
  vi.useFakeTimers();
  const { update } = renderMerged(true);
  update({ questionIndex: 1 });

  const scroll = byId("learning-shell-scroll");
  expect(scroll).toHaveAttribute("data-page", "primed");
  expect(scroll).toHaveAttribute("data-motion", "reduced");
  expect(scroll.getAttribute("class")).toContain("learning-shell-scroll-motion-reduced");
  expect(byId("learning-shell-stage")).not.toHaveAttribute("data-motion");
});

test("[MT4] 합친 흐름의 전환 중에도 맨 위 스크롤 보정과 흐림 상자는 전환을 입지 않는다", () => {
  vi.useFakeTimers();
  const { update } = renderMerged();
  update({ questionIndex: 1 });

  const fog = screen.queryByTestId("learning-shell-rest-fog");
  expect(fog).not.toBeNull();
  expect(fog).not.toHaveAttribute("data-page");
  expect(byId("learning-shell-scroll").contains(fog)).toBe(false);
  expect(fog).toHaveAttribute("user-interaction-enabled", "false");
});
