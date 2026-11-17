import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  mountChat,
  nativeInput,
  presenceProbe,
  slotContent,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(CC-KB1 · CC-KB2, 2026-11-17 Android 기기): 대화를 비우면 확인 대화상자와 사이드바가 한꺼번에 닫힌다(부모로 한 칸이
// 아니라 끝까지). Android는 누른 단추가 사라지면 초점을 숨은 <input>으로 옮겨 휴대폰 키보드를 띄우므로, 끝까지 닫힌 다음 프레임에도
// 초점을 내리고 접근성 초점은 사라진 「Clear chat」 줄이 아니라 사이드바를 연 설정 단추로 돌린다. 키보드 자리는 닫힌 채다.

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

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

async function clearFromSidebar() {
  tapId(ids.settings);
  tapId(ids.sidebarClear);
  vi.mocked(inputFocus.blurPhoneInput).mockClear();
  vi.mocked(inputFocus.restoreAccessibilityFocus).mockClear();
  tapButtonIn("ui-lynx-dialog-action-clear");
  await settle();
  advance(16);
}

test("CC-KB1. 비우면 다음 프레임에 휴대폰 입력 초점을 내리고, 접근성 초점은 설정 단추로 간다 · 키보드 자리는 닫힘", async () => {
  mountChat({ probe: presenceProbe("absent") });

  await clearFromSidebar();

  expect(screen.queryByTestId(ids.clearDialog)).toBeNull();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  expect(inputFocus.blurPhoneInput).toHaveBeenCalled();
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledWith(ids.settings);
  expect(inputFocus.restoreAccessibilityFocus).not.toHaveBeenCalledWith(ids.sidebarClear);
  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();
  expect(slotContent()).toBe("closed");
});

test("CC-KB2. 휴대폰 키보드 모드에서 키보드를 연 채 사이드바로 가 비워도 키보드는 다시 올라오지 않는다", async () => {
  mountChat({ probe: presenceProbe("present") });
  tapId(ids.field);
  advance(16);
  nativeInput("focus", "");
  vi.mocked(inputFocus.focusPhoneInput).mockClear();

  await clearFromSidebar();

  expect(inputFocus.blurPhoneInput).toHaveBeenCalled();
  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();
  expect(slotContent()).toBe("closed");
});
