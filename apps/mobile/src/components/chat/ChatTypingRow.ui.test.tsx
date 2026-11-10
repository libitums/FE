import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { ChatTypingRow } from "./ChatTypingRow";

// `ui` 계층(MC-UI4): 입력 중 줄 — 줄 전체가 한 요소 낭독, 움직임 줄이기에서만 chat-typing-still.

afterEach(cleanup);

const avatar = { name: "미나", imageUrl: null };

test("MC-UI4. 줄 하나가 접근성 요소이고 라벨이 한 줄로 읽힌다 · 점은 셋", () => {
  render(<ChatTypingRow avatar={avatar} label="미나 is typing" testId="typing" />);

  const row = screen.getByTestId("typing");
  expect(row.getAttribute("accessibility-element")).toBe("true");
  expect(row.getAttribute("accessibility-label")).toBe("미나 is typing");
  expect(row.querySelectorAll(".chat-dot")).toHaveLength(3);
  expect(row.querySelector(".chat-typing")).not.toBeNull();
});

test("MC-UI4. 기본 움직임에서는 점이 멈추지 않는다", () => {
  render(<ChatTypingRow avatar={avatar} label="x" testId="typing" />);

  expect(screen.getByTestId("typing").querySelector(".chat-dot")).not.toBeNull();
  expect(screen.getByTestId("typing").querySelector(".chat-typing-still")).toBeNull();
});

test("MC-UI4. 움직임 줄이기면 점 상자에 chat-typing-still이 붙는다", () => {
  render(
    <MotionProvider motion="reduced">
      <ChatTypingRow avatar={avatar} label="x" testId="typing" />
    </MotionProvider>,
  );

  expect(
    screen.getByTestId("typing").querySelector(".chat-typing.chat-typing-still"),
  ).not.toBeNull();
});
