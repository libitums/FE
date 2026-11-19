import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  KEYS_AN,
  mountChat,
  mountChatOpen,
  outgoingCount,
  tapButtonIn,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { messengerAccessTestIds as access } from "./messenger-access";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(GC-U1 ~ GC-U6): 비회원 방(ADR-0166) — 첫 인사는 읽고, 보내기 · 사진/음성 · 방 메뉴는 「로그인 필요」 대화상자.
// 대화상자의 주 단추는 로그인 흐름(onSignInRequired), Not now는 닫기만. 닫을 때 이벤트 하나.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const prompt = () => screen.queryByTestId(access.prompt);
const tapAction = (id: "sign-in" | "later") => tapButtonIn(`ui-lynx-dialog-action-${id}`);

test("GC-U1 비회원이 글을 써서 보내면 대화상자가 서고, 출처로 보내지 않으며 내 줄도 없다", () => {
  const onSignInRequired = vi.fn();
  const { source } = mountChatOpen({ onSignInRequired });
  const sendText = vi.spyOn(source, "sendText");
  tapKeys(...KEYS_AN);
  tapId(ids.send);

  expect(sendText).not.toHaveBeenCalled();
  expect(outgoingCount()).toBe(0);
  expect(prompt()).not.toBeNull();
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe("Sign in to send messages");
  expect(screen.getByTestId("ui-lynx-dialog-action-sign-in").textContent).toContain(
    "Sign up or log in",
  );
  expect(screen.getByTestId("ui-lynx-dialog-action-later").textContent).toContain("Not now");
  expect(onSignInRequired).not.toHaveBeenCalled();
});

test("GC-U2 대화상자가 선 동안 뒤 화면은 낭독에서 숨는다", () => {
  mountChatOpen({ onSignInRequired: vi.fn() });
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  const body = screen.getByTestId(ids.screen).firstElementChild;
  expect(body?.getAttribute("accessibility-elements-hidden")).toBe("true");
});

test("GC-U3 주 단추는 로그인 흐름을 부르고 닫히며, 이벤트 chat_sign_in_prompt_closed(send · sign_in)가 난다", () => {
  const onSignInRequired = vi.fn();
  const eventSink = vi.fn();
  mountChatOpen({ onSignInRequired, eventSink });
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  tapAction("sign-in");

  expect(onSignInRequired).toHaveBeenCalledTimes(1);
  expect(prompt()).toBeNull();
  expect(eventSink.mock.calls.map(([event]) => event)).toEqual([
    expect.objectContaining({
      name: "chat_sign_in_prompt_closed",
      surface: "chat",
      trigger: "send",
      choice: "sign_in",
    }),
  ]);
});

test("GC-U4 Not now는 닫기만 하고(later), 입력한 글은 남는다", () => {
  const onSignInRequired = vi.fn();
  const eventSink = vi.fn();
  mountChatOpen({ onSignInRequired, eventSink });
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  tapAction("later");

  expect(onSignInRequired).not.toHaveBeenCalled();
  expect(prompt()).toBeNull();
  expect(screen.getByTestId(ids.display).textContent).toBe("안");
  expect(eventSink.mock.calls.map(([event]) => event)).toEqual([
    expect.objectContaining({ trigger: "send", choice: "later" }),
  ]);
});

test("GC-U5 사진 · 음성 요청과 방 메뉴(사이드바)도 대화상자 — 요청 창 · 사이드바는 서지 않는다", () => {
  const eventSink = vi.fn();
  mountChat({ onSignInRequired: vi.fn(), eventSink });
  tapId(ids.snapshot);
  expect(prompt()).not.toBeNull();
  expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  tapAction("later");

  tapId(ids.settings);
  expect(prompt()).not.toBeNull();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  tapAction("later");

  expect(eventSink.mock.calls.map(([event]) => (event as { trigger: string }).trigger)).toEqual([
    "media",
    "menu",
  ]);
});

test("GC-U6 회원(onSignInRequired 없음)은 그대로 보낸다", () => {
  const { source } = mountChatOpen();
  const sendText = vi.spyOn(source, "sendText");
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(sendText).toHaveBeenCalledTimes(1);
  expect(prompt()).toBeNull();
});
