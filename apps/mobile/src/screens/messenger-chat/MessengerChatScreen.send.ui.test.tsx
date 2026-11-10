import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  advance,
  CANNED,
  clearBackHandlers,
  incomingCount,
  KEYS_AN,
  mountChatOpen,
  outgoingCount,
  tapId,
  tapKeys,
  textOf,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI11): 방의 보내기 흐름 — 학습 키로 글을 쓰고 보내면 내 줄이 서고, 600 ms 뒤 입력 중,
// 다시 1800 ms 뒤 정해 둔 답이 온다. 빈 · 공백 글은 보낼 수 없고 머리 뒤로는 onExit. 타이머는 가짜.

const timing = CHAT_PLACEHOLDERS.timing;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("MC-UI11. 방이 서면 머리에 상대 이름이 있고 상대의 첫 글이 로그에 있다", () => {
  mountChatOpen();

  expect(textOf(ids.title)).toBe("미나");
  expect(textOf(ids.screen)).toContain("오늘 뭐 해요?");
  expect(incomingCount()).toBe(1);
  expect(outgoingCount()).toBe(0);
});

test("MC-UI11. 학습 키 ㅇ ㅏ ㄴ을 누르면 입력 칸에 「안」이 서고 보내기가 켜진다", () => {
  mountChatOpen();
  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("false");

  tapKeys(...KEYS_AN);

  expect(textOf(ids.display)).toBe("안");
  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("true");
});

test("MC-UI11. 보내면 내 줄이 하나 서고 입력 칸이 비며 600 ms 뒤 입력 중, 1800 ms 뒤 정해 둔 답이 온다", () => {
  const { source } = mountChatOpen();
  const sendText = vi.spyOn(source, "sendText");
  tapKeys(...KEYS_AN);

  tapId(ids.send);

  expect(sendText).toHaveBeenCalledTimes(1);
  expect(sendText).toHaveBeenCalledWith("mina", "안");
  expect(outgoingCount()).toBe(1);
  expect(textOf(ids.display)).not.toBe("안");
  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("false");
  expect(screen.queryByTestId(ids.typing)).toBeNull();

  advance(timing.typingDelayMs);
  expect(screen.getByTestId(ids.typing).getAttribute("accessibility-label")).toBe("미나 is typing");
  expect(incomingCount()).toBe(1);

  advance(timing.replyDelayMs);
  expect(screen.queryByTestId(ids.typing)).toBeNull();
  expect(incomingCount()).toBe(2);
  const bubbles = screen.getAllByTestId(ids.incoming);
  expect(bubbles[1]?.textContent).toContain(CANNED.ko);
  expect(bubbles[1]?.textContent).toContain(CANNED.en);
});

// MC2-UI16(계약 변경 1.5): 내 줄은 ui-lynx ChatBubble이 아니라 앱 말풍선(`messenger-chat-my-bubble`)이고, 번역 줄이 없다.
test("MC-UI11. 내 말풍선은 outgoing 줄 안에 보낸 글을 담는다", () => {
  mountChatOpen();
  tapKeys(...KEYS_AN);
  tapId(ids.send);

  const mine = screen.getByTestId(ids.outgoing);
  expect(within(mine).getByTestId("messenger-chat-my-bubble").textContent?.trim()).toBe("안");
  expect(within(mine).queryByTestId("ui-lynx-chat-bubble")).toBeNull();
});

test("MC-UI11. 빈 글이면 보내기가 꺼져 있고 탭해도 아무것도 보내지 않는다", () => {
  const { source } = mountChatOpen();
  const sendText = vi.spyOn(source, "sendText");

  const send = screen.getByTestId(ids.send);
  expect(send.getAttribute("data-enabled")).toBe("false");
  tapId(ids.send);

  expect(sendText).not.toHaveBeenCalled();
  expect(outgoingCount()).toBe(0);
});

test("MC-UI11. 공백만 있는 글도 보낼 수 없다", () => {
  const { source } = mountChatOpen();
  const sendText = vi.spyOn(source, "sendText");
  tapKeys("space");

  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("false");
  tapId(ids.send);

  expect(sendText).not.toHaveBeenCalled();
  expect(outgoingCount()).toBe(0);
});

test("MC-UI11. 지우기 키로 글을 모두 지우면 보내기가 다시 꺼진다", () => {
  mountChatOpen();
  tapKeys(...KEYS_AN);
  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("true");

  tapKeys("backspace", "backspace", "backspace");

  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("false");
});

test("MC-UI11. 머리 뒤로 단추가 onExit을 한 번 부른다", () => {
  const { onExit } = mountChatOpen();

  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
});
