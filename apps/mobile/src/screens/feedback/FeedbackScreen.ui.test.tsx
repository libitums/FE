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

// ---------------------------------------------------------------- 아래 fog (스크롤의 형제)

function allFogs(): HTMLElement[] {
  return screen.queryAllByTestId("ui-lynx-fog");
}

function fogBox(): HTMLElement {
  const box = screen.queryByTestId("feedback-screen-fog");
  expect(box).not.toBeNull();
  return box as HTMLElement;
}

test("[FG1] 처음 렌더에 아래 fog 상자가 서고 안의 Fog가 아래 방향으로 가득 찬다", () => {
  render(<FeedbackScreen onSubmit={vi.fn(async () => true)} onExit={vi.fn()} />);

  const box = fogBox();
  // 속성의 존재만 본다 — 실제 통과는 e2e S7(c)의 몫. event-through는 Lynx 안의 형제로 터치를 내려보내지 않아
  // 띠 안의 탭 · 끌기를 삼켰다(e2e r02). 그 옛 방식이 돌아오면 실패한다.
  expect(box).toHaveAttribute("user-interaction-enabled", "false");
  expect(box).not.toHaveAttribute("event-through");
  const inner = within(box).queryAllByTestId("ui-lynx-fog");
  expect(inner).toHaveLength(1);
  expect(inner[0]).toHaveAttribute("data-direction", "bottom");
  const className = inner[0].getAttribute("class") ?? "";
  expect(className).toContain("ui-lynx-fog-size-full");
  expect(className).toContain("ui-lynx-fog-color-surface-default");
});

test("[FG2] fog 상자는 스크롤 안이 아니라 루트에서 스크롤의 다음 형제다", () => {
  render(<FeedbackScreen onSubmit={vi.fn(async () => true)} onExit={vi.fn()} />);

  const box = fogBox();
  const scroll = screen.getByTestId("feedback-screen-scroll");
  expect(scroll.contains(box)).toBe(false);
  expect(within(scroll).queryAllByTestId("ui-lynx-fog")).toHaveLength(0);

  const root = scroll.parentElement as HTMLElement;
  expect(box.parentElement).toBe(root);
  const children = Array.from(root.children);
  expect(children).toHaveLength(3);
  expect(children[0].getAttribute("class")).toContain("feedback-screen-header");
  expect(children[1]).toBe(scroll);
  expect(children[2]).toBe(box);
});

test("[FG3] 별점 → 보내기 → 성공으로 감사 문구가 선 뒤에도 fog 상자가 남는다", async () => {
  const onSubmit = vi.fn(async () => true);
  render(<FeedbackScreen onSubmit={onSubmit} onExit={vi.fn()} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-5"), {});
  fireEvent.tap(sendButton(), {});
  await flush();

  expect(screen.getByTestId("feedback-screen-sent")).toBeInTheDocument();
  expect(fogBox()).toBeInTheDocument();
  expect(allFogs()).toHaveLength(1);
});

// 가드: 스크롤의 속성과 자식은 fog를 더해도 그대로입니다 — 끝 여백은 본문 상자의 몫입니다.
test("[FG4] 스크롤의 속성과 직계 자식은 그대로다", () => {
  render(<FeedbackScreen onSubmit={vi.fn(async () => true)} onExit={vi.fn()} />);

  const scroll = screen.getByTestId("feedback-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "false");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0].getAttribute("class")).toContain("feedback-screen-body");
});
