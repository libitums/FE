import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  ideaSetA,
  mountChatOpen,
  nativeInput,
  outgoingCount,
  presenceProbe,
  seedOf,
  slotContent,
  tapId,
  textOf,
} from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { createTrialStore } from "./trial-store";

// `ui` 계층(IS-UI1 ~ UI5, 2026-11-17): 답장 보기를 누르면 입력 칸을 거치지 않고 그 글을 바로 보낸다 — 보내기 단추와 같은 관문
// (엽전이 모자라면 상점) · 보낸 뒤 판을 접고 휴대폰 키보드를 올리지 않는다 · 입력 칸의 쓰던 글은 그대로 · 낭독은 「보내기」를 붙인다.

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

test("IS-UI1. 보기를 누르면 그 글을 바로 보내고 입력 칸은 비어 있으며 판이 접힌다", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("absent") });
  const sendText = vi.spyOn(source, "sendText");
  tapId(ids.ideasButton);

  tapId(ids.idea(1));

  expect(sendText).toHaveBeenCalledTimes(1);
  expect(sendText).toHaveBeenCalledWith("mina", ideaSetA[1].ko, { suggestion: { index: 1 } }); // 칩 탭 표시(ADR-0210 D1)
  expect(outgoingCount()).toBe(1);
  expect(textOf(ids.display)).not.toContain(ideaSetA[1].ko);
  expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
  expect(slotContent()).toBe("closed");
});

test("IS-UI6. 같은 보기를 빠르게 두 번 눌러도(판이 접히기 전 같은 요소) 한 번만 보낸다", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("absent") });
  const sendText = vi.spyOn(source, "sendText");
  tapId(ids.ideasButton);
  const el = screen.getByTestId(ids.idea(1));
  const target = el.querySelector('[data-testid="ui-lynx-button"]') ?? el;

  fireEvent.tap(target, {});
  fireEvent.tap(target, {});

  expect(sendText).toHaveBeenCalledTimes(1);
});

test("IS-UI2. 휴대폰 모드에서 보기를 보내도 휴대폰 키보드를 다시 올리지 않는다", () => {
  mountChatOpen({ probe: presenceProbe("present") });
  advance(16);
  tapId(ids.ideasButton);
  vi.mocked(inputFocus.focusPhoneInput).mockClear();

  tapId(ids.idea(0));
  advance(CHAT_PLACEHOLDERS.timing.underlaySettleMs);

  expect(inputFocus.focusPhoneInput).not.toHaveBeenCalled();
  expect(outgoingCount()).toBe(1);
  expect(slotContent()).toBe("closed");
});

test("IS-UI3. 휴대폰으로 쓰던 글은 보기를 보내도 입력 칸에 그대로 남는다", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("present") });
  const sendText = vi.spyOn(source, "sendText");
  nativeInput("focus", "");
  advance(CHAT_PLACEHOLDERS.timing.underlaySettleMs);
  nativeInput("input", "안");
  tapId(ids.ideasButton);

  tapId(ids.idea(2));

  expect(sendText).toHaveBeenCalledWith("mina", ideaSetA[2].ko, { suggestion: { index: 2 } });
  expect(vi.mocked(inputFocus.clearPhoneInput)).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.send).getAttribute("data-enabled")).toBe("true");
});

test("IS-UI4. 엽전이 모자라면 보내지 않고 엽전 상점이 열린다(보내기 단추와 같은 관문)", () => {
  const roomId = "mina";
  mountChatOpen({
    roomId,
    seed: seedOf(fixtureRoom(roomId)),
    wallet: createCoinWallet({ earned: 2 }),
    trial: createTrialStore(0),
    tier: "free",
  });
  tapId(ids.ideasButton);

  tapId(ids.idea(0));

  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(outgoingCount()).toBe(0);
});

test("IS-UI5. 보기의 낭독은 보낸다는 것을 함께 말한다", () => {
  mountChatOpen();
  tapId(ids.ideasButton);

  const label = screen.getByTestId(ids.idea(0)).getAttribute("accessibility-label") ?? "";

  expect(label.startsWith(ideaSetA[0].ko)).toBe(true);
  expect(label.endsWith(", Send")).toBe(true);
});
