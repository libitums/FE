import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  KEYS_ANNYEONGHA,
  mountChatOpen,
  nativeInput,
  presenceProbe,
  slotContent,
  slotHeight,
  tapId,
  tapKeys,
  textOf,
  useWindowHeight,
} from "./chat-ui.test-support";
import { resolveChatKeyboardHeight } from "./keyboard-height";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI13 · UI14): 학습 ↔ 휴대폰 키보드 전환. 초점 호출(chat-input-focus)은 모킹한다.
// 전환 중 자리 높이가 같다는 것(UI14)은 슬롯 data-height와 MessengerKeyboard 높이로 본다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

let restoreWindow: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  restoreWindow?.();
  restoreWindow = null;
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const settle = CHAT_PLACEHOLDERS.timing.underlaySettleMs;
const toggleToPhone = () => tapId(ids.toggle("phone"));
const toggleToLearning = () => tapId(ids.toggle("learning"));

test("MC-UI13. 「안녕하」를 쓰고 Phone으로 바꾸면 초점을 한 번 부르고 입력 칸이 그 글을 default-value로 들고 학습 키보드가 아직 깔려 있다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapKeys(...KEYS_ANNYEONGHA);
  expect(textOf(ids.display)).toBe("안녕하");

  toggleToPhone();

  // 초점은 입력 칸이 켜진 모습이 그려진 다음 프레임에 갑니다(리뷰 #2).
  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();
  advance(16);
  expect(inputFocus.focusPhoneInput).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(ids.input).getAttribute("default-value")).toBe("안녕하");
  expect(screen.getByTestId(ids.toggle("phone")).getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId(ids.toggle("learning")).getAttribute("data-selected")).toBe("false");
  expect(screen.getByTestId(ids.field).getAttribute("data-keyboard")).toBe("phone");
  expect(slotContent()).toBe("learning-keyboard");
});

test("MC-UI13. 휴대폰 키보드가 올라와 focus 이벤트가 오고 300 ms가 지나면 자리가 빈 자리 표시로 바뀐다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapKeys(...KEYS_ANNYEONGHA);
  toggleToPhone();

  nativeInput("focus", "안녕하");
  expect(slotContent()).toBe("learning-keyboard");
  advance(settle - 1);
  expect(slotContent()).toBe("learning-keyboard");
  advance(1);

  expect(slotContent()).toBe("phone-spacer");
  expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
});

test("MC-UI13. 휴대폰으로 쓴 「안녕하세」는 Hangul로 돌아와도 이어 쳐 「안녕하세요」가 된다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapKeys(...KEYS_ANNYEONGHA);
  toggleToPhone();
  nativeInput("focus", "안녕하");
  advance(settle);

  nativeInput("input", "안녕하세");
  toggleToLearning();

  expect(inputFocus.blurPhoneInput).toHaveBeenCalledTimes(1);
  expect(slotContent()).toBe("learning-keyboard");
  expect(screen.getByTestId(ids.toggle("learning")).getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId(ids.toggle("phone")).getAttribute("data-selected")).toBe("false");
  expect(textOf(ids.display)).toBe("안녕하세");

  tapKeys("ㅇ", "ㅛ");

  expect(textOf(ids.display)).toBe("안녕하세요");
});

test("MC-UI13. 같은 쪽 토글을 다시 눌러도 초점 호출이 늘지 않는다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });

  toggleToLearning();

  expect(inputFocus.blurPhoneInput).not.toHaveBeenCalled();
  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();
  expect(slotContent()).toBe("learning-keyboard");
});

test("MC-UI13. 휴대폰 모드에서 보내기 키(confirm)를 보내면 글이 나가고 입력 칸 비우기를 부른다", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("absent") });
  const sendText = vi.spyOn(source, "sendText");
  toggleToPhone();
  nativeInput("focus", "");
  advance(settle);
  nativeInput("input", "안녕하세요");

  nativeInput("confirm", "안녕하세요");

  expect(sendText).toHaveBeenCalledWith("mina", "안녕하세요");
  expect(inputFocus.clearPhoneInput).toHaveBeenCalledTimes(1);
});

test("MC-UI14. 자리 높이는 학습 · 휴대폰 · 보기에서 같고 resolveChatKeyboardHeight 결과이며 키보드에 같은 높이가 간다", () => {
  restoreWindow = useWindowHeight(667);
  const edges = { bottom: 34, left: 0, right: 0 };
  const expected = String(
    resolveChatKeyboardHeight({ stored: null, screenHeight: 667, bottomInset: 34 }),
  );
  mountChatOpen({ probe: presenceProbe("absent"), edges });

  expect(slotHeight()).toBe(expected);
  expect(screen.getByTestId("messenger-keyboard").style.height).toBe(`${expected}px`);

  toggleToPhone();
  nativeInput("focus", "");
  advance(settle);
  expect(slotContent()).toBe("phone-spacer");
  expect(slotHeight()).toBe(expected);

  tapId(ids.ideasButton);
  expect(slotContent()).toBe("ideas");
  expect(slotHeight()).toBe(expected);
});

test("MC-UI14. 저장된 휴대폰 키보드 높이가 있으면 그 값이 자리 높이다", () => {
  mountChatOpen({
    probe: presenceProbe("absent"),
    store: { read: () => 291 },
    edges: { bottom: 34, left: 0, right: 0 },
  });

  expect(slotHeight()).toBe("291");
  expect(screen.getByTestId("messenger-keyboard").style.height).toBe("291px");
});
