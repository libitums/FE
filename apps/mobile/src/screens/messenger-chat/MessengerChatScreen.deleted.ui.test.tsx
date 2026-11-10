import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI26): 열려 있는 방이 출처에서 사라지면(다른 곳에서 지움) onExit이 한 번만 불린다(두 번 아님).

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("MC-UI26. 방이 있는 동안에는 onExit이 불리지 않는다", () => {
  const { onExit } = mountChat();

  expect(screen.getByTestId(ids.screen)).toBeTruthy();
  expect(onExit).not.toHaveBeenCalled();
});

test("MC-UI26. 출처에서 방이 사라지면 onExit이 정확히 한 번 불린다", () => {
  const { source, onExit } = mountChat();
  expect(screen.getByTestId(ids.screen)).toBeTruthy();

  act(() => {
    source.deleteRoom("mina");
  });

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("MC-UI26. 사라진 뒤 출처가 더 바뀌거나 시간이 흘러도 onExit은 늘지 않는다", () => {
  const { source, onExit } = mountChat();
  expect(screen.getByTestId(ids.screen)).toBeTruthy();

  act(() => {
    source.deleteRoom("mina");
  });
  act(() => {
    source.deleteRoom("mina");
  });
  advance(10_000);

  expect(onExit).toHaveBeenCalledTimes(1);
});
