import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { ChatLog } from "./ChatLog";
import { realChildren } from "../../lib/dom.test-support";

// `ui` 계층(MC-UI6): 대화 로그 — 세로 scroll-view 속성 · 안쪽 한 겹 · followKey가 바뀌어도 던지지 않는다.

afterEach(cleanup);

test("MC-UI6. 세로 scroll-view이고 바 없음이며 안쪽 상자 한 겹 안에 children이 든다", () => {
  render(
    <ChatLog testId="log">
      <view data-testid="a" />
      <view data-testid="b" />
    </ChatLog>,
  );

  const log = screen.getByTestId("log");
  expect(log.tagName.toLowerCase()).toBe("scroll-view");
  expect(log.className).toContain("chat-log");
  expect(log.getAttribute("scroll-orientation")).toBe("vertical");
  expect(log.getAttribute("scroll-bar-enable")).toBe("false");
  expect(realChildren(log)).toHaveLength(1);
  const inner = realChildren(log)[0];
  expect(inner?.className).toContain("chat-log-inner");
  expect(realChildren(inner).map((c) => c.getAttribute("data-testid"))).toEqual(["a", "b"]);
});

test("MC-UI6. followKey가 바뀌어도 던지지 않고 같은 로그를 유지한다", () => {
  const { rerender } = render(
    <ChatLog testId="log" followKey={1}>
      <view data-testid="a" />
    </ChatLog>,
  );
  expect(screen.getByTestId("a")).toBeTruthy();

  expect(() =>
    rerender(
      <ChatLog testId="log" followKey={2}>
        <view data-testid="a" />
      </ChatLog>,
    ),
  ).not.toThrow();
  expect(screen.getByTestId("log")).toBeTruthy();
  expect(screen.getByTestId("a")).toBeTruthy();
});
