import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { MoreRoot } from "../app/nav-state";
import { MoreMenu } from "./MoreMenu";
import { moreMenuTestIds as ids } from "./more-menu.contract";

// `ui` 계층: 더보기 메뉴 카드(ADR-0168) — 줄 셋의 순서 · 글 · NEW · 단어 수, 줄 누름 · 바깥 누름.

afterEach(() => {
  cleanup();
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
  fireEvent.tap(screen.getByTestId(ids.row(root)), {});
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(root);
  expect(onClose).not.toHaveBeenCalled();
});

test("MM5. 바깥(막)을 누르면 닫힘", () => {
  const { onSelect, onClose } = mount();
  fireEvent.tap(screen.getByTestId(ids.catch), {});
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});
