import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

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

function sheet(
  entrance: SheetEntranceMotion,
  completed = 4,
  caretOffset = 0,
  handlers: { onStart?: () => void; onClose?: () => void } = {},
) {
  return (
    <StepSheet
      title="Ordering"
      top={518}
      caretOffset={caretOffset}
      lessonOrdinal={3}
      completedActivityCount={completed}
      totalActivityCount={4}
      onStart={handlers.onStart ?? (() => {})}
      onClose={handlers.onClose ?? (() => {})}
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
      expect(pop).not.toHaveAttribute("user-interaction-enabled");
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
    // 언마운트는 렌더러가 스냅샷 정리용 10초 타이머를 하나 남깁니다(`@lynx-js/react` commit) — 이 컴포넌트 몫이 아니라 비웁니다.
    vi.clearAllTimers();

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

// 기기 e2e SM6(Android, 2026-10-19)에서 찾은 결함의 회귀입니다 — 대기 중 말풍선 자리를 누르면 닫혀야 하는데, 탭을 끈
// 말풍선이 탭을 삼켜 가림막에 닿지 않았습니다. Lynx는 탭을 조상으로만 올리므로(ADR-0055 D6) 말풍선 래퍼가 잡아 닫습니다.
// 테스트 DOM은 자손 → 래퍼 올림을 흉내 내지 않습니다 — 래퍼의 잡기와 시작의 꺼짐을 따로 보고, 올림은 e2e SM6이 집니다.
const tapPopCatch = (): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-pop"), { eventType: "catchEvent" });
  });
};
const tapStart = (): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  });
};

describe("StepSheet 대기 중 탭", () => {
  test("SS7. awaiting: 말풍선 래퍼가 탭을 잡아 닫고, 시작은 막지 않는다(ADR-0053 D5)", () => {
    const onStart = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    render(sheet("awaiting", 4, 0, { onStart, onClose }));

    tapPopCatch();
    tapStart();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  test.each(["expressive", "fade", "none"] as const)(
    "SS7. %s: 래퍼는 탭을 잡지 않고, 시작은 한 번 불린다",
    (entrance) => {
      const onStart = vi.fn<() => void>();
      const onClose = vi.fn<() => void>();
      render(sheet(entrance, 4, 0, { onStart, onClose }));

      tapPopCatch();
      tapStart();

      expect(onClose).not.toHaveBeenCalled();
      expect(onStart).toHaveBeenCalledTimes(1);
    },
  );
});
