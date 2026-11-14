import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  advance,
  clearBackHandlers,
  KEYS_AN,
  mountChatOpen,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MM-UI1 · UI2): 대화방 움직임 1순위 — 처음 있던 글은 그대로, 보낸 내 글 · 새로 온 답은 등장 감싸개를 갖고,
// 보내기 단추는 누를 때마다 튀는 클래스를 번갈아 단다.

const timing = CHAT_PLACEHOLDERS.timing;
const enterOf = (el: Element | undefined) => el?.parentElement?.getAttribute("class") ?? "";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("MM-UI1 방을 열 때 있던 글은 감싸개가 없고, 보낸 내 글은 오른쪽 · 새로 온 답은 왼쪽 등장 감싸개를 갖는다", () => {
  mountChatOpen();
  expect(enterOf(screen.getAllByTestId(ids.incoming)[0])).not.toContain("messenger-chat-enter");

  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(enterOf(screen.getAllByTestId(ids.outgoing).at(-1))).toContain("messenger-chat-enter-me");

  advance(timing.typingDelayMs + timing.replyDelayMs);
  expect(enterOf(screen.getAllByTestId(ids.incoming).at(-1))).toContain(
    "messenger-chat-enter-them",
  );
});

test("MM-UI2 보내기 단추는 누를 때마다 튀는 클래스를 번갈아 단다", () => {
  mountChatOpen();
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(screen.getByTestId(ids.send).getAttribute("class")).toContain(
    "messenger-chat-send-bump-1",
  );
});
