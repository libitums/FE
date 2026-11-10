import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  KEYS_AN,
  mountChat,
  nativeInput,
  presenceProbe,
  slotContent,
  slotHeight,
  systemBack,
  tapId,
  tapLog,
  tapKeys,
  textOf,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(사용자 결정 2026-11-09): 방은 키보드 자리와 키보드 토글이 닫힌 채 열린다. 입력 칸을 누르면 키보드 계획대로 열리고,
// 로그를 누르거나 뒤로가기를 하면 접힌다. 뒤로가기 순서: 겹침 → 열린 키보드 · 보기 패널 → 방 나가기.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("방이 열리면 키보드 자리와 토글 줄이 없고 머리 · 로그 · 기능 줄 · 입력 줄만 있다", () => {
  mountChat({ probe: presenceProbe("absent") });

  expect(slotContent()).toBe("closed");
  expect(slotHeight()).toBe("0");
  expect(screen.queryByTestId(ids.toggleRow)).toBeNull();
  expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
  expect(screen.getByTestId(ids.header)).toBeTruthy();
  expect(screen.getByTestId(ids.log)).toBeTruthy();
  expect(screen.getByTestId(ids.composer)).toBeTruthy();
});

test("입력 칸을 누르면 학습 키보드와 토글 줄이 열린다(탐지가 absent · unknown)", () => {
  mountChat({ probe: presenceProbe("absent") });

  tapId(ids.field);

  expect(slotContent()).toBe("learning-keyboard");
  expect(screen.getByTestId(ids.toggleRow)).toBeTruthy();
});

test("탐지가 present이면 입력 칸을 눌러도 토글은 없고 휴대폰 입력에 초점을 보낸다", () => {
  mountChat({ probe: presenceProbe("present") });
  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();

  tapId(ids.field);
  advance(16);

  expect(screen.queryByTestId(ids.toggleRow)).toBeNull();
  expect(slotContent()).toBe("phone-spacer");
  expect(inputFocus.focusPhoneInput).toHaveBeenCalledTimes(1);
});

test("로그를 누르면 키보드와 토글이 접히고 쓰던 글은 남으며 다시 열면 이어 쓴다", () => {
  mountChat({ probe: presenceProbe("absent") });
  tapId(ids.field);
  tapKeys(...KEYS_AN);

  tapLog();

  expect(slotContent()).toBe("closed");
  expect(screen.queryByTestId(ids.toggleRow)).toBeNull();
  expect(textOf(ids.display)).toBe("안");

  tapId(ids.field);
  expect(slotContent()).toBe("learning-keyboard");
  expect(textOf(ids.display)).toBe("안");
});

test("휴대폰 키보드가 올라와 있을 때 로그를 누르면 초점을 내리고 접는다", () => {
  mountChat({ probe: presenceProbe("present") });
  tapId(ids.field);
  advance(16);
  nativeInput("focus", "");

  tapLog();

  expect(inputFocus.blurPhoneInput).toHaveBeenCalledTimes(1);
  expect(slotContent()).toBe("closed");
});

test("닫힌 채 전구를 누르면 보기 패널이 열리고, 토글은 키보드였다면 보일 때만 보인다", () => {
  mountChat({ probe: presenceProbe("absent") });
  tapId(ids.ideasButton);
  expect(slotContent()).toBe("ideas");
  expect(screen.getByTestId(ids.toggleRow)).toBeTruthy();
});

test("닫힌 채 보내기를 눌러도 키보드가 열리지 않는다", () => {
  const { source } = mountChat({ probe: presenceProbe("absent") });
  const sendText = vi.spyOn(source, "sendText");
  tapId(ids.field);
  tapKeys(...KEYS_AN);
  tapLog();

  tapId(ids.send);

  expect(sendText).toHaveBeenCalledWith("mina", "안");
  expect(slotContent()).toBe("closed");
});

test("열린 키보드에서 보내면 키보드는 열린 채 남는다", () => {
  mountChat({ probe: presenceProbe("absent") });
  tapId(ids.field);
  tapKeys(...KEYS_AN);

  tapId(ids.send);

  expect(slotContent()).toBe("learning-keyboard");
});

test("뒤로가기 순서: 겹침 → 열린 키보드 → 방 나가기", () => {
  const { onExit } = mountChat({ probe: presenceProbe("absent") });
  tapId(ids.field);
  tapId(ids.settings);
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();

  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  expect(slotContent()).toBe("learning-keyboard");
  expect(onExit).not.toHaveBeenCalled();

  expect(systemBack()).toBe(true);
  expect(slotContent()).toBe("closed");
  expect(onExit).not.toHaveBeenCalled();

  expect(systemBack()).toBe(true);
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("보기 패널이 열려 있을 때 뒤로가기는 패널을 먼저 접는다", () => {
  const { onExit } = mountChat({ probe: presenceProbe("absent") });
  tapId(ids.ideasButton);

  systemBack();

  expect(slotContent()).toBe("closed");
  expect(onExit).not.toHaveBeenCalled();
});
