import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { FeedbackScreen } from "./FeedbackScreen";
import { announce } from "../../lib/accessibility";

vi.mock("../../lib/accessibility", () => ({ announce: vi.fn() }));
afterEach(() => vi.clearAllMocks());

function sendButton(): HTMLElement {
  return within(screen.getByTestId("feedback-screen-send")).getByTestId("ui-lynx-button");
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

test("[FS1] 별점을 고르기 전에는 보내기가 막혀 있고 onSubmit을 부르지 않는다", () => {
  const onSubmit = vi.fn(async () => true);
  render(<FeedbackScreen onSubmit={onSubmit} onExit={vi.fn()} />);

  fireEvent.tap(sendButton(), {});
  expect(onSubmit).not.toHaveBeenCalled();
});

test("[FS2] 별점 → 보내기 → 성공이면 감사 문구로 바뀐다", async () => {
  const onSubmit = vi.fn(async () => true);
  render(<FeedbackScreen onSubmit={onSubmit} onExit={vi.fn()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-5"), {});
  fireEvent.tap(sendButton(), {});
  await flush();

  expect(onSubmit).toHaveBeenCalledWith(5, "");
  expect(screen.getByTestId("feedback-screen-sent")).toBeInTheDocument();
  expect(screen.queryByTestId("feedback-screen-send")).toBeNull();
});

test("[FS3] 실패면 폼이 남고 실패 문구가 선다", async () => {
  const onSubmit = vi.fn(async () => false);
  render(<FeedbackScreen onSubmit={onSubmit} onExit={vi.fn()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-2"), {});
  fireEvent.tap(sendButton(), {});
  await flush();

  expect(screen.getByTestId("feedback-screen-failed")).toBeInTheDocument();
  expect(screen.getByTestId("feedback-screen-send")).toBeInTheDocument();
});

test("[FS4] 나가기는 onExit 한 번", () => {
  const onExit = vi.fn();
  render(<FeedbackScreen onSubmit={vi.fn(async () => true)} onExit={onExit} />);
  fireEvent.tap(
    within(screen.getByTestId("feedback-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("[FS5] 전송 예외를 알리고 입력을 유지한 채 다시 보낼 수 있다", async () => {
  const onSubmit = vi
    .fn()
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce(true);
  render(<FeedbackScreen onSubmit={onSubmit} onExit={vi.fn()} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-4"), {});
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView!.CustomEvent;
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value: "Please add more lessons." } }),
  );
  fireEvent.tap(sendButton(), {});
  await flush();

  const failure = screen.getByTestId("feedback-screen-failed");
  expect(announce).toHaveBeenCalledWith(failure.textContent);
  expect(screen.getByTestId("ui-lynx-text-field")).toHaveAttribute("data-availability", "enabled");
  expect(onSubmit).toHaveBeenNthCalledWith(1, 4, "Please add more lessons.");
  fireEvent.tap(sendButton(), {});
  await flush();

  expect(onSubmit).toHaveBeenNthCalledWith(2, 4, "Please add more lessons.");
  expect(screen.getByTestId("feedback-screen-sent")).toBeInTheDocument();
});
