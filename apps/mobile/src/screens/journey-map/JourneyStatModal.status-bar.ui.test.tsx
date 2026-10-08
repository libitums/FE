import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { JourneyStatModal } from "./JourneyStatModal";

// `ui` 계층: 상태바 아이콘 표지가 모달 루트에 달리는지 봅니다(계약 3.2 · r02.2).

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

const markers = () =>
  Array.from(document.querySelectorAll(`[data-statusbar="${lightStatusBarIcons}"]`));

test.each(["streak", "trophy"] as const)("UT7: %s 모달의 루트에 표지가 하나 선다", (kind) => {
  render(
    <JourneyStatModal kind={kind} value={3} track={{ completedCount: 3 }} onClose={vi.fn()} />,
  );

  expect(markers()).toHaveLength(1);
  expect(markers()[0]).toBe(screen.getByTestId(`journey-stat-modal-${kind}`));
});

// r03.1(B1): 연속 학습 모달의 운석 c는 상단 safe area inset 아래에 선다. 입력은
// `lynx.__globalProps`, 관찰은 운석 요소의 인라인 `style` 속성뿐이다(a · b · 장식 층 · 크기는 그대로).

const meteor = (slot: "a" | "b" | "c") =>
  document.querySelector(`.journey-stat-modal-meteor-${slot}`);

const inlineTop = (element: Element | null): string | undefined =>
  (element?.getAttribute("style") ?? "").match(/(?:^|;)\s*top:\s*([^;]+)/)?.[1]?.trim();

test.each([
  [50, "50px"],
  [0, "0px"],
  [59, "59px"],
])("UT14: streak 모달의 운석 c는 위쪽 inset %i일 때 인라인 top %s", (top, expected) => {
  setGlobalProps({ safeAreaInsets: { top, bottom: 0, left: 0, right: 0 } });
  render(
    <JourneyStatModal kind="streak" value={3} track={{ completedCount: 3 }} onClose={vi.fn()} />,
  );

  expect(meteor("c")).not.toBeNull();
  expect(inlineTop(meteor("c"))).toBe(expected);
  // a · b는 CSS의 자리 그대로다 — 인라인 top이 없다.
  expect(meteor("a")).not.toBeNull();
  expect(meteor("b")).not.toBeNull();
  expect(inlineTop(meteor("a"))).toBeUndefined();
  expect(inlineTop(meteor("b"))).toBeUndefined();
  // right · 크기는 인라인으로 덮지 않는다.
  for (const slot of ["a", "b", "c"] as const) {
    expect(meteor(slot)?.getAttribute("style") ?? "").not.toMatch(/right|width|height/);
  }
});

test("UT15: trophy 모달에는 운석이 없다(장식은 연속 학습에만)", () => {
  setGlobalProps({ safeAreaInsets: { top: 50, bottom: 0, left: 0, right: 0 } });
  render(
    <JourneyStatModal kind="trophy" value={3} track={{ completedCount: 3 }} onClose={vi.fn()} />,
  );

  expect(document.querySelectorAll('[class*="journey-stat-modal-meteor"]')).toHaveLength(0);
});
