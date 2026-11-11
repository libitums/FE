import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import { chatTurnsTestIds as ids } from "./chat-turns.contract";
import { OutOfFreePanel } from "./OutOfFreePanel";

// `ui` 계층(MC2-UI6): T3 판 — 제목 · 본문(시계) · 단추 둘 순서 · 잔액 줄 · dialog 역할 · 콜백 · 제목 초점 요청(다음 프레임).
// 가정(구현자가 따를 것): 초점 요청은 `chat-input-focus.restoreAccessibilityFocus(id)`이고, id를 가진 접근성 요소(제목)가 판 안에 있다.

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
  vi.useRealTimers();
});

function mount(over: Partial<{ balance: number; price: number }> = {}) {
  const handlers = {
    onKeepChatting: vi.fn<() => void>(),
    onBackToChats: vi.fn<() => void>(),
  };
  render(
    <OutOfFreePanel
      total={3}
      price={over.price ?? 10}
      balance={over.balance ?? 100}
      reset={{ hours: 5, minutes: 12 }}
      {...handlers}
    />,
  );
  return handlers;
}

const tap = (testId: string): void => {
  const el = screen.getByTestId(testId);
  fireEvent.tap(el.querySelector('[data-testid="ui-lynx-button"]') ?? el, {});
};
const before = (a: HTMLElement, b: HTMLElement): boolean =>
  (a.compareDocumentPosition(b) & 4) !== 0;

test("MC2-UI6. 제목 · 본문(5h 12m) · 잔액 줄이 서고 판은 dialog 역할이다", () => {
  mount();

  const panel = screen.getByTestId(ids.panel);
  expect(panel.textContent).toContain("Today's 3 free messages are used");
  expect(panel.textContent).toContain(
    "Keep chatting with coins, or come back in 5h 12m for free ones.",
  );
  expect(screen.getByTestId(ids.panelBalance).textContent?.trim()).toBe("You have 100 coins");
  const dialog = panel.hasAttribute("accessibility-role-description")
    ? panel
    : panel.querySelector("[accessibility-role-description]");
  expect(dialog?.getAttribute("accessibility-role-description")).toBe("dialog");
});

test("MC2-UI6. 단추 둘이 Keep chatting → Back to chats 순서로 선다", () => {
  mount();

  const keep = screen.getByTestId(ids.panelKeep);
  const back = screen.getByTestId(ids.panelBack);
  expect(before(keep, back)).toBe(true);
  expect(keep.textContent).toContain("Keep chatting");
  expect(keep.textContent).toContain("10 / message");
  expect(back.textContent).toContain("Back to chats");
});

test("MC2-UI6. 판에는 Go unlimited 단추가 없다 — 무제한 티켓은 학습 전용(2026-11-10 결정)", () => {
  mount();

  const panel = screen.getByTestId(ids.panel);
  expect(panel.textContent).not.toContain("Go unlimited");
  expect(document.querySelector('[data-testid="messenger-chat-out-unlimited"]')).toBeNull();
  const buttons = Array.from(
    screen
      .getByTestId(ids.panelActions)
      .querySelectorAll(':scope > [accessibility-traits="button"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(buttons).toEqual([ids.panelKeep, ids.panelBack]);
});

test("MC2-UI6. Keep chatting은 엽전 아이콘이 있고 낭독은 가격을 읽는다", () => {
  mount();

  const keep = screen.getByTestId(ids.panelKeep);
  expect(keep.querySelector("svg")).not.toBeNull();
  const labelled = keep.hasAttribute("accessibility-label")
    ? keep
    : keep.querySelector("[accessibility-label]");
  expect(labelled?.getAttribute("accessibility-label")).toBe("Keep chatting, 10 coins per message");
});

test("MC2-UI6. 단추마다 자기 콜백만 한 번 부른다", () => {
  const { onKeepChatting, onBackToChats } = mount();

  tap(ids.panelKeep);
  expect(onKeepChatting).toHaveBeenCalledTimes(1);
  expect(onBackToChats).not.toHaveBeenCalled();
  tap(ids.panelBack);
  expect(onBackToChats).toHaveBeenCalledTimes(1);
  expect(onKeepChatting).toHaveBeenCalledTimes(1);
});

test("MC2-UI6. 잔액이 가격보다 적어도 판은 같은 단추 둘과 잔액 줄을 보인다", () => {
  mount({ balance: 2 });

  expect(screen.getByTestId(ids.panelBalance).textContent).toContain("2");
  expect(screen.getByTestId(ids.panelKeep)).toBeTruthy();
});

test("MC2-UI6. 열릴 때 제목에 접근성 초점을 다음 프레임에 요청한다(같은 커밋에서는 부르지 않는다)", () => {
  mount();
  const restore = vi.mocked(inputFocus.restoreAccessibilityFocus);
  expect(restore).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(16);
  });

  expect(restore).toHaveBeenCalledTimes(1);
  const id = restore.mock.calls[0]?.[0] ?? "";
  const target = document.querySelector(`[id="${id}"]`);
  expect(target, `#${id} 요소`).not.toBeNull();
  expect(target?.getAttribute("accessibility-element")).toBe("true");
  expect(screen.getByTestId(ids.panel).contains(target)).toBe(true);
});
