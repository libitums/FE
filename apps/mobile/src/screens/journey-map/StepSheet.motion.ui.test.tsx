import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";
import { sheetEntranceClasses, type SheetEntranceMotion } from "./journey-map-sheet-motion";

// `ui` 계층: 말풍선이 등장 종류(`entrance`)를 클래스 · 속성 · DOM 유무로 옮기는지 봅니다. 종류별 묶음의 값은 unit이
// 지고, 여기서는 그 값이 어느 요소로 나가는지만 봅니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const entrances: readonly SheetEntranceMotion[] = ["none", "awaiting", "expressive", "fade"];

function sheet(entrance: SheetEntranceMotion, completed = 4, caretOffset = 0) {
  return (
    <StepSheet
      title="Ordering"
      top={518}
      caretOffset={caretOffset}
      lessonOrdinal={3}
      completedActivityCount={completed}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
      entrance={entrance}
    />
  );
}

const classOf = (testId: string): string | null => screen.getByTestId(testId).getAttribute("class");
const percent = (): string | null => screen.getByTestId("step-sheet-progress-percent").textContent;

describe("StepSheet 등장 종류", () => {
  test.each(entrances)(
    "SS1. %s: 말풍선 · 채움 · 숨쉬기 층 · 표식 · 탭 가능이 묶음대로 선다",
    (entrance) => {
      const classes = sheetEntranceClasses(entrance);
      render(sheet(entrance));

      const pop = screen.getByTestId("step-sheet-pop");
      expect(pop.getAttribute("class")).toBe(classes.bubble);
      expect(classOf("step-sheet-progress-fill")).toBe(classes.fill);
      expect(screen.queryByTestId("step-sheet-start-glow") !== null).toBe(classes.startGlow);
      expect(pop.getAttribute("data-motion")).toBe(classes.motionReduced ? "reduced" : null);
      expect(pop.getAttribute("user-interaction-enabled")).toBe(
        classes.bubbleInteractive ? null : "false",
      );
    },
  );

  test("SS1. 접근성 노드(진행 줄)에는 data-motion이 섞이지 않는다", () => {
    render(sheet("fade"));

    expect(screen.getByTestId("step-sheet-progress")).not.toHaveAttribute("data-motion");
    expect(screen.getByTestId("step-sheet-pop")).toHaveAttribute("data-motion", "reduced");
  });

  test("SS2. 말풍선 기준점이 꼬리 끝(패널 가운데 + caretOffset)이고 앵커의 세로 자리는 그대로다", () => {
    render(sheet("expressive", 4, 32.5));

    expect(screen.getByTestId("step-sheet-pop").getAttribute("style")).toContain("157.5px 0px");
    expect(screen.getByTestId("step-sheet-anchor").getAttribute("style")).toContain("518px");
  });

  test("SS2. 기준점이 caretOffset을 따라간다 (왼쪽 칸)", () => {
    render(sheet("awaiting", 4, -105));

    expect(screen.getByTestId("step-sheet-pop").getAttribute("style")).toContain("20px 0px");
  });

  test("SS2. DOM 사슬: 앵커 > 말풍선 > 패널, 시작 버튼은 래퍼 안이고 숨쉬기 층이 바로 앞 형제다", () => {
    render(sheet("expressive"));

    const anchor = screen.getByTestId("step-sheet-anchor");
    const pop = screen.getByTestId("step-sheet-pop");
    expect(pop.parentElement).toBe(anchor);
    expect(screen.getByTestId("step-sheet-panel").parentElement).toBe(pop);
    expect(screen.getByTestId("step-sheet-caret").parentElement).toBe(pop);
    const start = screen.getByTestId("step-sheet-start");
    expect(start.parentElement?.getAttribute("class")).toContain("step-sheet-start-wrap");
    expect(start.previousElementSibling).toBe(screen.getByTestId("step-sheet-start-glow"));
  });

  test("SS2. 숨쉬기 층이 없는 종류에서도 시작 버튼은 같은 래퍼 안이다", () => {
    render(sheet("none"));

    expect(screen.getByTestId("step-sheet-start").parentElement?.getAttribute("class")).toContain(
      "step-sheet-start-wrap",
    );
  });
});

describe("StepSheet 최종값과 타이머 없음", () => {
  test("SS5. fade: 첫 렌더부터 최종 백분율, 튀김 · 숨쉬기 · 채움 등장 없음, 타이머 0", () => {
    render(sheet("fade", 4));

    expect(percent()).toBe("100%");
    expect(classOf("step-sheet-progress-percent-pop")).toBe("step-sheet-progress-percent-pop");
    expect(screen.queryByTestId("step-sheet-start-glow")).not.toBeInTheDocument();
    expect(classOf("step-sheet-progress-fill")).toBe("step-sheet-progress-fill");
    expect(vi.getTimerCount()).toBe(0);
    cleanup();

    render(sheet("fade", 1));
    expect(percent()).toBe("25%");
    expect(vi.getTimerCount()).toBe(0);
  });

  test.each(["awaiting", "none"] as const)("SS5. %s: 100%가 즉시이고 타이머가 없다", (entrance) => {
    render(sheet(entrance, 4));

    expect(percent()).toBe("100%");
    expect(classOf("step-sheet-progress-percent-pop")).toBe("step-sheet-progress-percent-pop");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("SS5. expressive 0%: 0%에 머물고 타이머 · 튀김 · 채움이 없다", () => {
    render(sheet("expressive", 0));

    expect(percent()).toBe("0%");
    expect(classOf("step-sheet-progress-percent-pop")).toBe("step-sheet-progress-percent-pop");
    expect(screen.queryByTestId("step-sheet-progress-fill")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
