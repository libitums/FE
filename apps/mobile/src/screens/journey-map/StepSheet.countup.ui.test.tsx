import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { StepSheet } from "./StepSheet";
import { sheetPercentCountUpFor, sheetPercentLabel } from "./journey-map-sheet-motion";

// `ui` 계층: 백분율 카운트업의 순서 — 타이머 하나가 12칸을 굴리고, 접근성 이름은 처음부터 최종이며, 닫으면 타이머가
// 남지 않습니다. 프레임 값은 unit이 지고 여기서는 화면에 나온 글자가 그 프레임을 따르는지만 봅니다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function sheet(onStart: () => void = () => {}, onClose: () => void = () => {}) {
  return (
    <StepSheet
      title="Ordering"
      top={518}
      caretOffset={0}
      lessonOrdinal={3}
      completedActivityCount={4}
      totalActivityCount={4}
      onStart={onStart}
      onClose={onClose}
      entrance="expressive"
    />
  );
}

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const percent = (): string | null => screen.getByTestId("step-sheet-progress-percent").textContent;
const wrapClass = (): string | null =>
  screen.getByTestId("step-sheet-progress-percent-pop").getAttribute("class");
const accessibleName = (): string | null =>
  screen.getByTestId("step-sheet-progress").getAttribute("accessibility-label");

function frames(): readonly number[] {
  const countUp = sheetPercentCountUpFor("expressive", 100);
  if (countUp === null) {
    throw new Error("100% 카운트업 일정이 있어야 합니다");
  }
  return countUp.frames;
}

test("SS3. 0%에서 시작해 시작 지연 뒤 50ms마다 한 칸씩 오르고 끝에 한 번 튄다", () => {
  render(sheet());

  expect(percent()).toBe("0%");
  expect(wrapClass()).toBe("step-sheet-progress-percent-pop");
  advance(300);
  expect(percent()).toBe("0%");
  advance(50);
  expect(percent()).toBe(sheetPercentLabel(frames()[1] as number));
  for (let index = 2; index <= 12; index += 1) {
    advance(50);
    expect(percent()).toBe(sheetPercentLabel(frames()[index] as number));
  }
  expect(percent()).toBe("100%");
  expect(wrapClass()).toBe("step-sheet-progress-percent-pop step-sheet-progress-percent-pop-enter");
});

test("SS3. 접근성 이름은 카운트업 내내 같은 최종값이다", () => {
  render(sheet());

  const name = accessibleName();
  expect(percent()).toBe("0%");
  expect(name).toMatch(/100%$/);
  for (let index = 0; index < 18; index += 1) {
    advance(50);
    expect(accessibleName()).toBe(name);
  }
});

test("SS4. 타이머는 한 번에 하나이고 끝나면 0이며, 글자 바뀜은 12번 이하이고 말풍선은 다시 마운트되지 않는다", () => {
  render(sheet());
  const ids = [
    "step-sheet-pop",
    "step-sheet-panel",
    "step-sheet-progress",
    "step-sheet-progress-fill",
    "step-sheet-progress-percent-pop",
    "step-sheet-progress-percent",
    "step-sheet-start",
  ];
  const before = ids.map((id) => screen.getByTestId(id));
  const seen: (string | null)[] = [percent()];

  for (let tick = 0; tick < 20; tick += 1) {
    advance(50);
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1);
    seen.push(percent());
  }

  const changes = seen.filter((text, index) => index > 0 && text !== seen[index - 1]);
  expect(changes.length).toBeGreaterThan(0);
  expect(changes.length).toBeLessThanOrEqual(12);
  expect(seen[seen.length - 1]).toBe("100%");
  expect(vi.getTimerCount()).toBe(0);
  expect(ids.map((id) => screen.getByTestId(id))).toEqual(before);
});

test("SS6. 카운트업 도중에도 닫기가 즉시 한 번 불린다", () => {
  const onClose = vi.fn<() => void>();
  render(sheet(() => {}, onClose));

  advance(400);
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  });

  expect(onClose).toHaveBeenCalledTimes(1);
});

// 테스트 라이브러리가 언마운트에 타이머를 하나 남기므로, 카운트업이 없는 `fade`를 같은 순서로 지워 본 값과 견줍니다.
function timersLeftAfterUnmount(entrance: "fade" | "expressive"): number {
  vi.clearAllTimers();
  const view = render(
    <StepSheet
      title="Ordering"
      top={518}
      caretOffset={0}
      lessonOrdinal={3}
      completedActivityCount={4}
      totalActivityCount={4}
      onStart={() => {}}
      onClose={() => {}}
      entrance={entrance}
    />,
  );
  advance(400);
  expect(vi.getTimerCount()).toBe(entrance === "expressive" ? 1 : 0);
  view.unmount();
  return vi.getTimerCount();
}

test("SS6. 카운트업 도중 언마운트해도 카운트업 타이머가 남지 않는다", () => {
  const baseline = timersLeftAfterUnmount("fade");

  expect(timersLeftAfterUnmount("expressive")).toBe(baseline);
});

test("SS6. 등장 중에도 시작이 즉시 한 번 불린다", () => {
  const onStart = vi.fn<() => void>();
  render(sheet(onStart));

  advance(400);
  act(() => {
    fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
  });

  expect(onStart).toHaveBeenCalledTimes(1);
});
