import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { loginCountries } from "./login-countries";
import { LoginCountrySheet } from "./LoginCountrySheet";

// `ui` 계층: 국가 시트의 아래 여백(android-tabbar-inset F2 · UC3~UC4). 입력은
// `lynx.__globalProps`, 관찰은 testid 요소뿐입니다.

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

function renderSheet() {
  const selected = loginCountries[0];
  if (selected === undefined) throw new Error("loginCountries가 비어 있습니다");
  return render(<LoginCountrySheet selected={selected} onCommit={vi.fn()} onClose={vi.fn()} />);
}

// 2026-11-17: 시트 아래 비우기는 시트마다가 아니라 `AppBottomSheet`가 패널 맨 아래에서 진다(ADR-0044 D3 개정).
test("[UC3] Android 3버튼(아래 48) → 시트 패널 맨 아래 48 비움, 내용 자리에는 목록만", () => {
  setGlobalProps({
    safeAreaInsets: { top: 0, bottom: 48, left: 0, right: 0 },
    tappableBottomInset: 48,
  });
  renderSheet();

  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style")).toMatch(/height:\s*48px/);
  expect(screen.getByTestId("ui-lynx-bottom-sheet-content").children.length).toBe(1);
});

test("[UC4] iOS 홈 인디케이터(아래 34) → 패널 아래 14 비움(ADR-0044 D3 2026-11-18)", () => {
  setGlobalProps({ safeAreaInsets: { top: 0, bottom: 34, left: 0, right: 0 } });
  renderSheet();

  expect(screen.getByTestId("ui-lynx-bottom-sheet-inset").getAttribute("style") ?? "").toMatch(
    /height:\s*14px/,
  );
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  expect(content.children.length).toBe(1);
});

test("[UC4b] Android 제스처(아래 24, 가로채지 않음) → 24 비움", () => {
  setGlobalProps({
    safeAreaInsets: { top: 0, bottom: 24, left: 0, right: 0 },
    tappableBottomInset: 0,
  });
  renderSheet();

  expect(screen.getByTestId("ui-lynx-bottom-sheet-inset").getAttribute("style")).toMatch(
    /height:\s*24px/,
  );
});

// 국가 목록 스크롤 상자도 스크롤 바를 끕니다 — 속성이 없으면 다른 스크롤 상자와 규칙이 갈립니다.
test("[UC5] login-screen-country-list에 scroll-bar-enable='false'·scroll-orientation='vertical'이 붙는다", () => {
  renderSheet();

  const list = screen.getByTestId("login-screen-country-list");
  expect(list).toHaveAttribute("scroll-bar-enable", "false");
  expect(list).toHaveAttribute("scroll-orientation", "vertical");
});
