import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { MoreRoot } from "../app/nav-state";
import * as inputFocus from "../screens/messenger-chat/chat-input-focus";
import { MoreMenu } from "./MoreMenu";
import { moreMenuTestIds as ids } from "./more-menu.contract";

vi.mock("../screens/messenger-chat/chat-input-focus", () => ({
  restoreAccessibilityFocus: vi.fn<(id: string) => void>(),
}));

// `ui` 계층: 더보기 메뉴 카드(ADR-0169) — 줄 셋의 순서 · 글 · NEW · 단어 수, 줄 누름 · 바깥 누름.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(inputFocus.restoreAccessibilityFocus).mockClear();
});

function mount(words = 13, due = 4) {
  const onSelect = vi.fn<(root: MoreRoot) => void>();
  const onClose = vi.fn();
  render(<MoreMenu words={words} due={due} onSelect={onSelect} onClose={onClose} />);
  return { onSelect, onClose };
}

test("MM1. 카드 안 줄은 Letters · My words · Settings 순서", () => {
  mount();
  const rows = Array.from(
    screen.getByTestId(ids.menu).querySelectorAll('[data-testid^="more-menu-row-"]'),
  ).map((row) => row.getAttribute("data-testid"));
  expect(rows).toEqual([
    "more-menu-row-letters",
    "more-menu-row-wordbook",
    "more-menu-row-settings",
  ]);
});

test("MM2. 줄마다 제목 · 설명, Letters에는 NEW, My words에는 단어 수 · 복습 수", () => {
  mount();
  expect(screen.getByTestId(ids.row("letters")).textContent).toContain("Letters");
  expect(screen.getByTestId(ids.row("letters")).textContent).toContain("NEW");
  expect(screen.getByTestId(ids.row("letters")).textContent).toContain(
    "Hear every consonant and vowel",
  );
  expect(screen.getByTestId(ids.row("wordbook")).textContent).toContain("13 words · 4 to review");
  expect(screen.getByTestId(ids.row("settings")).textContent).toContain("Account, language, sound");
  expect(screen.getByTestId(ids.row("wordbook")).textContent).not.toContain("NEW");
});

test("MM3. 낭독 이름은 줄 하나에 제목 · 새 표시 · 설명", () => {
  mount(1, 0);
  expect(screen.getByTestId(ids.row("letters"))).toHaveAttribute(
    "accessibility-label",
    "Letters, new, Hear every consonant and vowel",
  );
  expect(screen.getByTestId(ids.row("wordbook"))).toHaveAttribute(
    "accessibility-label",
    "My words, 1 word · 0 to review",
  );
  expect(screen.getByTestId(ids.row("settings"))).toHaveAttribute("accessibility-traits", "button");
});

test.each(["letters", "wordbook", "settings"] as const)("MM4. %s 줄을 누르면 그 줄", (root) => {
  const { onSelect, onClose } = mount();
  // 줄은 catchtap입니다 — 탭이 카드 둘레 자리(slot, 누르면 닫힘)까지 올라가지 않습니다.
  fireEvent.tap(screen.getByTestId(ids.row(root)), { eventType: "catchEvent" });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(root);
  expect(onClose).not.toHaveBeenCalled();
});

test("MM5. 바깥(막)을 누르면 닫힘", () => {
  const { onSelect, onClose } = mount();
  fireEvent.tap(screen.getByTestId(ids.catch), {});
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});

test("MM6. 카드 둘레(좌우 16 · 위 16 · 바와의 간격 8 — 자리 slot)를 눌러도 닫히고, 카드 면을 누르면 닫히지 않음", () => {
  const { onSelect, onClose } = mount();
  fireEvent.tap(screen.getByTestId(ids.slot), {});
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.tap(screen.getByTestId(ids.menu), { eventType: "catchEvent" });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});

test("MM7. 열린 다음 프레임에 접근성 초점을 첫 줄(Letters)로 보냄 — 카드가 바 앞이라 「Close menu」에서 앞으로 쓸어서는 닿지 않음", () => {
  vi.useFakeTimers();
  mount();
  expect(inputFocus.restoreAccessibilityFocus).not.toHaveBeenCalled();
  act(() => {
    vi.runAllTimers();
  });
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledExactlyOnceWith(ids.row("letters"));
  // 초점 요청은 `#id`로 찾으므로 줄은 test-id와 같은 id를 가진 접근성 요소입니다(a11y C1).
  const first = screen.getByTestId(ids.row("letters"));
  expect(first).toHaveAttribute("id", ids.row("letters"));
  expect(first).toHaveAttribute("accessibility-element", "true");
});

test("MM8. 자리 · 카드 · 바깥 막은 접근성 요소가 아님 — 낭독은 줄 셋만", () => {
  mount();
  for (const testId of [ids.slot, ids.menu, ids.catch]) {
    expect(screen.getByTestId(testId)).not.toHaveAttribute("accessibility-element");
  }
});
