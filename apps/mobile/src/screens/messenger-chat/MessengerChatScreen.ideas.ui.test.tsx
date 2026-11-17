import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  ideaSetA,
  LAST_THEM,
  mountChatOpen,
  outgoingCount,
  presenceProbe,
  seedOf,
  slotContent,
  slotHeight,
  tapId,
  textOf,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI15): 전구 → 답장 보기 패널 — 같은 높이의 자리 · 인용 = 상대 마지막 글 · 보기 셋(ko · roman · en) ·
// 보기 탭은 바로 보낸다(IS-UI1 ~ UI5, 2026-11-17) · Type myself는 직전 키보드로 · 보기가 없으면 전구가 꺼진다.

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

test("MC-UI15. 전구를 누르면 보기 패널이 키보드와 같은 높이의 자리에 선다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  const before = slotHeight();
  expect(slotContent()).toBe("learning-keyboard");

  tapId(ids.ideasButton);

  expect(slotContent()).toBe("ideas");
  expect(slotHeight()).toBe(before);
  expect(screen.getByTestId(ids.ideasPanel)).toBeTruthy();
  expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
});

test("MC-UI15. 인용은 상대의 마지막 글이고 보기 셋은 한국어 · 로마자 · 영어를 보인다", () => {
  mountChatOpen();
  tapId(ids.ideasButton);

  expect(textOf(ids.ideasQuote)).toBe(`「${LAST_THEM.ko}」`);
  ideaSetA.forEach((idea, index) => {
    const option = screen.getByTestId(ids.idea(index));
    expect(option.textContent).toContain(idea.ko);
    expect(option.textContent).toContain(idea.roman);
    expect(option.textContent).toContain(idea.en);
  });
  expect(screen.queryByTestId(ids.idea(3))).toBeNull();
  expect(textOf(ids.ideasTypeMyself)).toContain("Type myself");
});

test("MC-UI15. 상대 글이 아직 없으면 인용 줄이 없다", () => {
  mountChatOpen({ seed: seedOf(fixtureRoom("mina", { messages: [] })) });
  tapId(ids.ideasButton);

  expect(screen.queryByTestId(ids.ideasQuote)).toBeNull();
  expect(screen.getByTestId(ids.idea(0))).toBeTruthy();
});

test("MC-UI15. Type myself는 직전 키보드(학습)로 돌아간다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapId(ids.ideasButton);

  tapId(ids.ideasTypeMyself);

  expect(slotContent()).toBe("learning-keyboard");
  expect(screen.getByTestId("messenger-keyboard")).toBeTruthy();
  expect(outgoingCount()).toBe(0);
});

test("MC-UI15. 휴대폰 모드에서는 전구가 입력 초점을 내리고 Type myself가 다시 올린다", () => {
  mountChatOpen({ probe: presenceProbe("present") });
  advance(16);
  vi.mocked(inputFocus.focusPhoneInput).mockClear();
  expect(slotContent()).toBe("phone-spacer");

  tapId(ids.ideasButton);
  expect(inputFocus.blurPhoneInput).toHaveBeenCalledTimes(1);
  expect(slotContent()).toBe("ideas");

  tapId(ids.ideasTypeMyself);
  advance(16);
  expect(inputFocus.focusPhoneInput).toHaveBeenCalledTimes(1);
  expect(slotContent()).toBe("phone-spacer");
});

test("MC-UI15. 보기가 없는 방은 전구가 꺼져 있고 눌러도 패널이 서지 않는다", () => {
  mountChatOpen({ seed: seedOf(fixtureRoom("mina", { ideaSets: [] })) });

  const bulb = screen.getByTestId(ids.ideasButton);
  const node = bulb.hasAttribute("accessibility-traits")
    ? bulb
    : (bulb.querySelector("[accessibility-traits]") ?? bulb);
  expect(node.getAttribute("accessibility-traits") ?? "").toContain("disabled");

  tapId(ids.ideasButton);

  expect(slotContent()).not.toBe("ideas");
  expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
});
