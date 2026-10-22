import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SlowPlaybackToggle } from "./SlowPlaybackToggle";

// `ui` 계층: 「천천히」 토글은 지금 속도를 이름 · 상태 · 아이콘으로 그리고 탭을 위로 올린다.

test("ST1. normal이면 Slow, off · button · data-state off이고 체크 아이콘이 없다", () => {
  render(<SlowPlaybackToggle pace="normal" onToggle={() => {}} testId="slow" />);

  const toggle = screen.getByTestId("slow");
  expect(toggle).toHaveAttribute("accessibility-element", "true");
  expect(toggle).toHaveAttribute("accessibility-label", "Slow, off");
  expect(toggle).toHaveAttribute("accessibility-traits", "button");
  expect(toggle).toHaveAttribute("data-state", "off");
  expect(toggle.querySelectorAll("svg")).toHaveLength(0);
  expect(toggle).toHaveTextContent("Slow");
});

test("ST2. slow이면 Slow, on · data-state on이고 체크 아이콘이 하나다", () => {
  render(<SlowPlaybackToggle pace="slow" onToggle={() => {}} testId="slow" />);

  const toggle = screen.getByTestId("slow");
  expect(toggle).toHaveAttribute("accessibility-label", "Slow, on");
  expect(toggle).toHaveAttribute("accessibility-traits", "button");
  expect(toggle).toHaveAttribute("data-state", "on");
  const icons = toggle.querySelectorAll("svg");
  expect(icons).toHaveLength(1);
  expect(icons[0]).not.toHaveAttribute("accessibility-element");
  expect(icons[0]).not.toHaveAttribute("accessibility-label");
});

test("ST3. 탭하면 onToggle이 한 번 불린다", () => {
  const onToggle = vi.fn<() => void>();
  render(<SlowPlaybackToggle pace="normal" onToggle={onToggle} testId="slow" />);

  fireEvent.tap(screen.getByTestId("slow"), {});

  expect(onToggle).toHaveBeenCalledTimes(1);
});

test.each(["normal", "slow"] as const)(
  "ST4. %s에서 접근성 요소는 루트 하나이고 안의 text · svg는 접근성 속성이 없다",
  (pace) => {
    render(<SlowPlaybackToggle pace={pace} onToggle={() => {}} testId="slow" />);

    const toggle = screen.getByTestId("slow");
    const inner = [...toggle.querySelectorAll("text"), ...toggle.querySelectorAll("svg")];
    expect(inner.length).toBeGreaterThan(0);
    for (const element of inner) {
      expect(element).not.toHaveAttribute("accessibility-element");
      expect(element).not.toHaveAttribute("accessibility-label");
      expect(element).not.toHaveAttribute("accessibility-traits");
    }
    expect(toggle.querySelectorAll("[accessibility-element]")).toHaveLength(0);
  },
);
