import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { EpisodeSurveySheet } from "./EpisodeSurveySheet";

// `ui` 계층: Android 3버튼 바가 건너뛰기 버튼을 가리지 않도록 시트가 스스로 비우는 아래 여백
// (android-tabbar-inset F2 · UC1~UC2). 입력은 `lynx.__globalProps`, 관찰은 testid 요소뿐입니다.

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

function renderSheet() {
  return render(<EpisodeSurveySheet episodeTitle="Tutorial" onAnswer={vi.fn()} onSkip={vi.fn()} />);
}

// 2026-11-17: 시트 아래 비우기는 시트마다가 아니라 `AppBottomSheet`가 패널 맨 아래에서 진다(ADR-0044 D3 개정).
test("[UC1] Android 3버튼(아래 48) → 시트 패널 맨 아래 48 비움, 건너뛰기가 내용의 마지막", () => {
  setGlobalProps({
    safeAreaInsets: { top: 0, bottom: 48, left: 0, right: 0 },
    tappableBottomInset: 48,
  });
  renderSheet();

  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style")).toMatch(/height:\s*48px/);
  // 내용 자리(건너뛰기) 뒤, 패널 맨 아래에 섭니다.
  const contentBox = screen.getByTestId("ui-lynx-bottom-sheet-content");
  expect(contentBox.contains(inset)).toBe(false);
  expect(contentBox.compareDocumentPosition(inset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  const children = Array.from(content.children);
  expect(children[children.length - 1]).toBe(screen.getByTestId("episode-survey-skip"));
});

test("[UC2] iOS(키 없음) → 빈 자리 없음, 건너뛰기가 마지막", () => {
  setGlobalProps({ safeAreaInsets: { top: 0, bottom: 34, left: 0, right: 0 } });
  renderSheet();

  expect(screen.queryByTestId("ui-lynx-bottom-sheet-inset")).toBeNull();
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  const children = Array.from(content.children);
  expect(children[children.length - 1]).toBe(screen.getByTestId("episode-survey-skip"));
});

test("[UC2b] Android 제스처(아래 24) → 24 비움", () => {
  setGlobalProps({
    safeAreaInsets: { top: 0, bottom: 24, left: 0, right: 0 },
    tappableBottomInset: 0,
  });
  renderSheet();

  expect(screen.getByTestId("ui-lynx-bottom-sheet-inset").getAttribute("style")).toMatch(
    /height:\s*24px/,
  );
});
