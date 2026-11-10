import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { fireOnRef } from "./chat-ui.test-support";
import { chatTurnsTestIds as ids } from "./chat-turns.contract";
import { OutOfFreePanel } from "./OutOfFreePanel";

// `ui` 계층(접근성 C1 · M1 · M4): T3 판 — 큰 글자에서 판이 화면 밖으로 넘치지 않게 px 상한 + 본문만 스크롤, 단추 셋은 스크롤 밖,
// dialog 역할 설명은 접근성 요소(제목)에.

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
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(): void {
  render(
    <OutOfFreePanel
      total={3}
      price={10}
      balance={100}
      reset={{ hours: 5, minutes: 12 }}
      onKeepChatting={vi.fn<() => void>()}
      onGoUnlimited={vi.fn<() => void>()}
      onBackToChats={vi.fn<() => void>()}
    />,
  );
}

test("M1. 판 높이에 px 상한이 있다(화면 667 − 상태 바 0 − 머리 72 − 96 = 499)", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount();

  expect(screen.getByTestId(ids.panel).style.maxHeight).toBe("499px");
});

test("M1. 아이콘 · 제목 · 본문은 scroll-view 안이고 단추 셋 · 잔액 줄은 밖(고정)이다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount();

  const scroll = screen.getByTestId(ids.panelScroll);
  expect(scroll.tagName.toLowerCase()).toBe("scroll-view");
  expect(scroll.textContent).toContain("Today's 3 free messages are used");
  expect(scroll.contains(screen.getByTestId(ids.panelKeep))).toBe(false);
  expect(scroll.contains(screen.getByTestId(ids.panelUnlimited))).toBe(false);
  expect(scroll.contains(screen.getByTestId(ids.panelBack))).toBe(false);
  expect(scroll.contains(screen.getByTestId(ids.panelBalance))).toBe(false);
});

test("M1. 큰 글자로 내용이 넘치면 스크롤 칸 높이는 상한 − 고정부이고, 재기 전에는 강제하지 않는다", () => {
  vi.stubGlobal("SystemInfo", { pixelHeight: 1334, pixelRatio: 2 });
  mount();
  expect(screen.getByTestId(ids.panelScroll).style.height).toBe("");

  fireOnRef(ids.panelScrollContent, "layoutchange", { height: 600 });
  fireOnRef(ids.panelActions, "layoutchange", { height: 300 });

  expect(screen.getByTestId(ids.panelScroll).style.height).toBe("199px");
});

test("M4. dialog 역할 설명은 접근성 요소인 제목에 있고 감싸개에는 없다", () => {
  mount();

  const title = document.querySelector(`[id="${ids.panelTitle}"]`);
  expect(title?.getAttribute("accessibility-role-description")).toBe("dialog");
  expect(screen.getByTestId(ids.panel).hasAttribute("accessibility-role-description")).toBe(false);
});

function setFontScale(value: number | undefined): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps =
    value === undefined ? undefined : { fontScale: value };
}

test("F3. 가장 큰 접근성 글자(AX5 ≈ 3.1)에서는 Keep chatting이 세로로 쌓이고, AX-large(≈ 2.35)와 보통은 그대로다", () => {
  const keep = (): string => screen.getByTestId(ids.panelKeep).className;

  setFontScale(3.1);
  mount();
  expect(keep()).toContain("chat-out-keep-stacked");
  cleanup();

  setFontScale(2.35);
  mount();
  expect(keep()).not.toContain("chat-out-keep-stacked");
  cleanup();

  setFontScale(undefined);
  mount();
  expect(keep()).not.toContain("chat-out-keep-stacked");
});
