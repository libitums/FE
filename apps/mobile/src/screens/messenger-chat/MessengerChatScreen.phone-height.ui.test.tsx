import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import {
  advance,
  clearBackHandlers,
  mountChatOpen,
  nativeInput,
  presenceProbe,
  slotContent,
  slotHeight,
  tapId,
} from "./chat-ui.test-support";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { KeyboardHeightStore } from "./keyboard-ports";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(KH-UI1 ~ UI3): 휴대폰 키보드 자리는 입력 칸이 알린 실제 키보드 높이(`keyboardheightchange`)를 쓴다.
// 추정 표(260 · 300 · 320)보다 높은 키보드(툴바 · 추천 줄이 붙은 Gboard · 삼성 키보드 등)가 입력 줄을 덮던 것.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

type SystemInfoShape = { platform?: string; pixelHeight: number; pixelRatio: number };
const scope = globalThis as unknown as { SystemInfo: SystemInfoShape };
let previous: SystemInfoShape;

beforeEach(() => {
  vi.useFakeTimers();
  previous = scope.SystemInfo;
});
afterEach(() => {
  scope.SystemInfo = previous;
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const edges = { bottom: 24, left: 0, right: 0 };

/** 입력 칸이 키보드 높이를 알립니다 — Android는 물리 픽셀, iOS는 pt(Lynx `keyboardheightchange`). */
function keyboardHeight(height: number): void {
  const EventConstructor = screen.getByTestId(ids.input).ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${ids.input}"]`);
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
  );
}

function writableStore(initial: number | null = null) {
  let value = initial;
  const write = vi.fn<(height: number) => void>((height) => {
    value = height;
  });
  const store: KeyboardHeightStore = { read: () => value, write };
  return { store, write };
}

function phoneFocused(store: KeyboardHeightStore) {
  mountChatOpen({ probe: presenceProbe("absent"), store, edges });
  tapId(ids.toggle("phone"));
  nativeInput("focus", "");
  advance(CHAT_PLACEHOLDERS.timing.underlaySettleMs);
  expect(slotContent()).toBe("phone-spacer");
}

test("KH-UI1. Android 키보드가 360dp(물리 945px · 밀도 2.625)로 올라오면 자리도 360이고 그 값을 기기에 적는다", () => {
  scope.SystemInfo = { platform: "Android", pixelHeight: 2400, pixelRatio: 2.625 };
  const { store, write } = writableStore();
  phoneFocused(store);
  expect(Number(slotHeight())).toBeLessThan(360);

  keyboardHeight(945);

  expect(slotHeight()).toBe("360");
  expect(write).toHaveBeenLastCalledWith(360);
});

test("KH-UI2. iOS는 pt 그대로 쓰고, 키보드가 내려가며 알린 0은 잰 높이를 지우지 않는다", () => {
  scope.SystemInfo = { platform: "iOS", pixelHeight: 1334, pixelRatio: 2 };
  const { store, write } = writableStore();
  phoneFocused(store);

  keyboardHeight(336);
  expect(slotHeight()).toBe("336");

  keyboardHeight(0);
  // 같은 높이가 다시 와도(키보드가 다시 오름) 기기에 다시 적지 않는다.
  keyboardHeight(336);
  expect(write).toHaveBeenCalledTimes(1);
  tapId(ids.ideasButton);
  expect(slotContent()).toBe("ideas");
  expect(slotHeight()).toBe("336");
});

test("KH-UI3. 키보드 높이가 바뀌면(이모지 탭 · 툴바) 자리도 따라 바뀐다", () => {
  scope.SystemInfo = { platform: "iOS", pixelHeight: 1334, pixelRatio: 2 };
  const { store } = writableStore(300);
  phoneFocused(store);
  expect(slotHeight()).toBe("300");

  keyboardHeight(352);
  expect(slotHeight()).toBe("352");
});
