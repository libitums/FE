import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChatOpen,
  presenceProbe,
  slotContent,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(RL-UI1 · UI2, 2026-11-17): 추천 답변 토글은 열린 방에 바로 반영된다 — 방을 나갔다 오지 않아도
// 전구(답장 보기)가 꺼지고 켜진다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const bulbDisabled = () => screen.getByTestId(ids.ideasButton).getAttribute("data-disabled");

test("RL-UI1. 추천 답변을 끄면 열린 방의 전구가 바로 꺼지고, 켜면 바로 돌아온다", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("absent") });
  expect(bulbDisabled()).toBe("false");

  act(() => source.setPreferences({ replyIdeas: false }));
  expect(bulbDisabled()).toBe("true");

  act(() => source.setPreferences({ replyIdeas: true }));
  expect(bulbDisabled()).toBe("false");
});

test("RL-UI2. 보기 판이 열린 채 추천 답변을 끄면 판이 바로 닫힌다(빈 판으로 남지 않는다)", () => {
  const { source } = mountChatOpen({ probe: presenceProbe("absent") });
  tapId(ids.ideasButton);
  expect(slotContent()).toBe("ideas");
  expect(screen.queryByTestId(ids.ideasPanel)).not.toBeNull();

  act(() => source.setPreferences({ replyIdeas: false }));

  expect(screen.queryByTestId(ids.ideasPanel)).toBeNull();
  expect(slotContent()).not.toBe("ideas");
});
