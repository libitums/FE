import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 여정 입장의 TalkBack 경로(접근성 감사 C1 · C2, ADR-0176) — Android는 평탄화된 글을 접근성 트리에서 지우고,
// `accessibility-enable-tap`이 없는 View에는 클릭 동작을 달지 않습니다.

afterEach(cleanup);

test("JE-A1. 「기초부터」는 TalkBack 두 번 탭으로 눌리고, 글은 트리에 남는다", () => {
  render(
    <JourneyEntryScreen
      safeArea={{ top: 0, bottom: 0 }}
      language="en"
      onSelectPath={vi.fn<() => void>()}
    />,
  );

  expect(screen.getByTestId("journey-entry-screen-basics")).toHaveAttribute(
    "accessibility-enable-tap",
    "true",
  );
  for (const part of ["title", "language", "display", "caption", "notice"]) {
    const text = screen.getByTestId(`journey-entry-screen-${part}`);
    expect(text).toHaveAttribute("flatten", "false");
    expect(text).toHaveAttribute("accessibility-element", "true");
  }
  expect(screen.getByTestId("journey-entry-screen-title")).toHaveAttribute(
    "accessibility-heading",
    "true",
  );
});
