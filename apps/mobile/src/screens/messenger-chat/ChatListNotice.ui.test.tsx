import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { ChatListNotice } from "./ChatListNotice";
import { LIST_NOTICE_MS } from "./messenger-list-notice";

// `ui` 계층(CP-UI1 ~ UI3): 메신저 목록 아래 안내(ADR-0127).

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const NOTICE = "chat-list-notice";

test("CP-UI1 안내가 오면 문구를 보이고 한 번 낭독하며, onNoticeShown을 한 번 부른다", () => {
  const spoken = vi.spyOn(accessibility, "announce");
  const onNoticeShown = vi.fn<() => void>();
  render(<ChatListNotice notice="chat-unavailable" onNoticeShown={onNoticeShown} />);
  expect(screen.getByTestId(NOTICE).textContent).toBe("This chat isn't available right now.");
  expect(onNoticeShown).toHaveBeenCalledTimes(1);
  expect(spoken).toHaveBeenCalledWith("This chat isn't available right now.");
  expect(spoken).toHaveBeenCalledTimes(1);
});

test("CP-UI2 3초 뒤 사라지고, 그 사이 notice가 null이 돼도(route에서 지움) 계속 보인다", () => {
  const onNoticeShown = vi.fn<() => void>();
  const view = render(<ChatListNotice notice="chat-unavailable" onNoticeShown={onNoticeShown} />);
  view.rerender(<ChatListNotice notice={null} onNoticeShown={onNoticeShown} />);
  expect(LIST_NOTICE_MS).toBe(3000);
  act(() => {
    vi.advanceTimersByTime(2999);
  });
  expect(screen.queryByTestId(NOTICE) !== null).toBe(true);
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(screen.queryByTestId(NOTICE) === null).toBe(true);
  expect(onNoticeShown).toHaveBeenCalledTimes(1);
});

test("CP-UI3 안내가 없으면 아무것도 그리지 않고 부르지 않는다", () => {
  const onNoticeShown = vi.fn<() => void>();
  render(<ChatListNotice notice={null} onNoticeShown={onNoticeShown} />);
  expect(screen.queryByTestId(NOTICE) === null).toBe(true);
  expect(onNoticeShown).not.toHaveBeenCalled();
});
