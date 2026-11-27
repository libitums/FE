import type { ReactNode } from "@lynx-js/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider, type Motion } from "@libitums/ui-lynx/motion";

import { RevealOnAnswer } from "./RevealOnAnswer";

// `ui` 계층: 답하면 카드가 펼쳐지는 공용 상자(ADR-0212). 단계는 `data-phase`와 클래스로, 높이는 인라인 style로 봅니다.
// 높이 답은 호스트의 `layoutchange`라 jsdom에서는 직접 쏩니다.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function tree(shown: boolean, motion: Motion = "standard"): ReactNode {
  return (
    <MotionProvider motion={motion}>
      <RevealOnAnswer shown={shown} itemCount={2} testId="probe-reveal">
        <RevealOnAnswer.Item order={0}>
          <text data-testid="probe-first">first</text>
        </RevealOnAnswer.Item>
        <RevealOnAnswer.Item order={1}>
          <text data-testid="probe-second">second</text>
        </RevealOnAnswer.Item>
      </RevealOnAnswer>
    </MotionProvider>
  );
}

const box = () => screen.queryByTestId("probe-reveal");
const content = () => screen.getByTestId("probe-reveal-content");
const itemClassOf = (testId: string) =>
  screen.getByTestId(testId).parentElement?.getAttribute("class") ?? "";
const styleOf = () => box()?.getAttribute("style") ?? "";
// 높이 답입니다. effect(다음 단계 타이머)까지 흘려보내려고 act로 감쌉니다.
const measure = (height: number) =>
  act(() => {
    fireEvent.layoutchange(content(), { detail: { height } });
  });

function answer(motion: Motion = "standard") {
  const view = render(tree(false, motion));
  view.rerender(tree(true, motion));
  return view;
}

test("RU1. 답하기 전에는 상자도 글도 문서에 없다", () => {
  render(tree(false));

  expect(box()).not.toBeInTheDocument();
  expect(screen.queryByTestId("probe-first")).not.toBeInTheDocument();
});

test("RU2. 처음부터 보이면(대본 켬) 움직이지 않는다 — 열림 · 높이 지정 없음 · 타이머 없음", () => {
  render(tree(true));

  expect(box()).toHaveAttribute("data-phase", "open");
  expect(styleOf()).not.toContain("height");
  expect(itemClassOf("probe-first")).toBe("reveal-on-answer-item");
  expect(vi.getTimerCount()).toBe(0);
});

test("RU3. 답하면 높이 0인 상자 안에 글이 대기 모양으로 선다(재는 중)", () => {
  answer();

  expect(box()).toHaveAttribute("data-phase", "measuring");
  expect(box()).toHaveAttribute("class", "reveal-on-answer reveal-on-answer-measuring");
  expect(styleOf()).toMatch(/height:\s*0px/);
  expect(itemClassOf("probe-first")).toContain("reveal-on-answer-item-pending");
});

test("RU4. 높이 답이 오면 그 높이까지 펼치고 글이 순서 지연과 함께 나타난다", () => {
  answer();

  measure(84);

  expect(box()).toHaveAttribute("data-phase", "expanding");
  expect(styleOf()).toMatch(/height:\s*84px/);
  expect(itemClassOf("probe-first")).toBe(
    "reveal-on-answer-item reveal-on-answer-item-entering reveal-on-answer-item-0",
  );
  expect(itemClassOf("probe-second")).toContain("reveal-on-answer-item-1");
});

test("RU5. 끝나면(2글 = 둘째 글 150 + 200 = 350ms) 높이 지정을 풀어 auto로 돌아간다", () => {
  answer();
  measure(84);

  act(() => {
    vi.advanceTimersByTime(349);
  });
  expect(box()).toHaveAttribute("data-phase", "expanding");

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(box()).toHaveAttribute("data-phase", "open");
  expect(styleOf()).not.toContain("height");
  expect(itemClassOf("probe-second")).toBe("reveal-on-answer-item");
  expect(vi.getTimerCount()).toBe(0);
});

test("RU6. 높이 답이 100ms 안에 없으면 A안 — 높이는 바로 서고 글만 나타난다", () => {
  answer();

  act(() => {
    vi.advanceTimersByTime(100);
  });

  expect(box()).toHaveAttribute("data-phase", "fading");
  expect(styleOf()).not.toContain("height");
  expect(itemClassOf("probe-first")).toContain("reveal-on-answer-item-entering");
});

test("RU7. 잰 높이가 0이면(아직 자리가 안 잡힘) 다음 답을 기다리고, 100ms 안에 없으면 A안으로 물러선다", () => {
  answer();

  measure(0);
  expect(box()).toHaveAttribute("data-phase", "measuring");

  act(() => {
    vi.advanceTimersByTime(100);
  });
  expect(box()).toHaveAttribute("data-phase", "fading");
});

test("RU8. 움직임 줄이기 — 답하면 바로 열림, 높이 지정 · 대기 클래스 · 타이머 없음", () => {
  answer("reduced");

  expect(box()).toHaveAttribute("data-phase", "open");
  expect(styleOf()).not.toContain("height");
  expect(itemClassOf("probe-first")).toBe("reveal-on-answer-item");
  expect(vi.getTimerCount()).toBe(0);
});

test("RU9. 펼치는 중 다음 문항으로 넘어가면(숨김) 상자가 걷히고 펼침 타이머가 풀린다", () => {
  const view = answer();
  measure(84);
  const clear = vi.spyOn(globalThis, "clearTimeout");

  view.rerender(tree(false));

  expect(box()).not.toBeInTheDocument();
  expect(clear).toHaveBeenCalledTimes(1);
  // 풀린 타이머는 늦게라도 상자를 되살리지 않습니다.
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(box()).not.toBeInTheDocument();
});

test("RU10. 다시 답하면(다음 문항) 처음부터 다시 잰다", () => {
  const view = answer();
  measure(84);
  view.rerender(tree(false));

  view.rerender(tree(true));

  expect(box()).toHaveAttribute("data-phase", "measuring");
  expect(styleOf()).toMatch(/height:\s*0px/);
});
