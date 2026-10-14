import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { AudioUnavailableControl } from "./AudioUnavailableControl";

// `ui` 계층: 아직 오디오가 없는 문항의 재생 조작 — 보조기술에는 꺼진 단추로 읽히고 눌러도 아무 일도 없다.

test("UA1. 넘긴 testid로 서고 꺼진 단추로 읽히며 눌러도 예외가 없고 재생 아이콘은 읽히지 않는다", () => {
  render(<AudioUnavailableControl testId="x" />);

  const control = screen.getByTestId("x");
  expect(control).toHaveAttribute("accessibility-element", "true");
  expect(control).toHaveAttribute("accessibility-traits", "disabled");
  expect(control).toHaveAttribute("data-state", "unavailable");
  expect(control).toHaveAttribute("accessibility-label", "Audio not available yet");

  expect(() => fireEvent.tap(control, {})).not.toThrow();

  const icons = control.querySelectorAll("svg");
  expect(icons.length).toBeGreaterThan(0);
  for (const icon of icons) {
    expect(icon).not.toHaveAttribute("accessibility-label");
    expect(icon).not.toHaveAttribute("accessibility-element");
    expect(icon).not.toHaveAttribute("accessibility-traits");
  }
});
