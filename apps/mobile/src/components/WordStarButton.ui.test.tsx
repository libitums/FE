import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { WordStarButton } from "./WordStarButton";

// `ui` 계층: 단어 별 단추(ADR-0169 즐겨찾기 개정) — 이름에 단어 · 켜짐은 「selected」 꼬리(ADR-0016 D3) · 누르면 반대 값 · 모양.

afterEach(() => {
  cleanup();
});

function mount(starred: boolean) {
  const onToggle = vi.fn<(starred: boolean) => void>();
  render(<WordStarButton word="물" starred={starred} onToggle={onToggle} testId="star" />);
  return { onToggle, button: screen.getByTestId("star") };
}

test("WSB1. 꺼짐 — 이름 「Star 물」 · 단추 · flatten false, 누르면 켬(true)", () => {
  const { onToggle, button } = mount(false);
  expect(button).toHaveAttribute("accessibility-label", "Star 물");
  expect(button).toHaveAttribute("accessibility-traits", "button");
  expect(button).toHaveAttribute("accessibility-element", "true");
  expect(button).toHaveAttribute("flatten", "false");
  expect(button).toHaveAttribute("data-starred", "false");
  fireEvent.tap(button, {});
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(true);
});

test("WSB2. 켜짐 — 이름에 「selected」 꼬리, 누르면 끔(false)", () => {
  const { onToggle, button } = mount(true);
  expect(button).toHaveAttribute("accessibility-label", "Star 물, selected");
  expect(button).toHaveAttribute("data-starred", "true");
  fireEvent.tap(button, {});
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(false);
});

test("WSB3. 켜짐은 채운 별, 꺼짐은 외곽선 별 — 색만이 아니라 모양으로도 가린다", () => {
  mount(true);
  const filled = screen.getByTestId("star").querySelector("svg")?.getAttribute("content") ?? "";
  cleanup();
  mount(false);
  const outline = screen.getByTestId("star").querySelector("svg")?.getAttribute("content") ?? "";
  expect(filled).toContain('fill="currentColor"');
  expect(outline).toContain('fill="none"');
  expect(outline).toContain('stroke="currentColor"');
});
