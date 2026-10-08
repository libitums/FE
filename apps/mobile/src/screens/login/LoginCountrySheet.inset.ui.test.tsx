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

test("[UC3] tappableBottomInset 48 → login-screen-country-inset 높이 48px, 시트 내용의 마지막 자식(목록 뒤)", () => {
  setGlobalProps({ tappableBottomInset: 48 });
  renderSheet();

  const inset = screen.getByTestId("login-screen-country-inset");
  expect(inset.getAttribute("style")).toMatch(/height:\s*48px/);
  // 큰 글자 배율로 시트가 넘쳐도 상자가 줄지 않아야 건너뛰기가 시스템 바 쪽으로 내려가지 않습니다.
  expect(inset.getAttribute("style")).toMatch(/flex-shrink:\s*0/);

  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  const children = Array.from(content.children);
  expect(children[children.length - 1]).toBe(inset);
  expect(children.length).toBeGreaterThan(1);
});

test("[UC4] tappableBottomInset 키 없음(iOS · 제스처) → 상자 없음", () => {
  setGlobalProps({ safeAreaInsets: { top: 0, bottom: 34, left: 0, right: 0 } });
  renderSheet();

  expect(screen.queryByTestId("login-screen-country-inset")).toBeNull();
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  expect(content.children.length).toBe(1);
});

test("[UC4b] tappableBottomInset 0 → 상자 없음", () => {
  setGlobalProps({ tappableBottomInset: 0 });
  renderSheet();

  expect(screen.queryByTestId("login-screen-country-inset")).toBeNull();
});
