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

test("[UC1] tappableBottomInset 48 → episode-survey-inset 높이 48px, 시트 내용의 마지막 자식(건너뛰기 뒤)", () => {
  setGlobalProps({ tappableBottomInset: 48 });
  renderSheet();

  const inset = screen.getByTestId("episode-survey-inset");
  expect(inset.getAttribute("style")).toMatch(/height:\s*48px/);
  // 큰 글자 배율로 시트가 넘쳐도 상자가 줄지 않아야 건너뛰기가 시스템 바 쪽으로 내려가지 않습니다.
  expect(inset.getAttribute("style")).toMatch(/flex-shrink:\s*0/);

  const skip = screen.getByTestId("episode-survey-skip");
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  const children = Array.from(content.children);
  expect(children[children.length - 1]).toBe(inset);
  expect(children.indexOf(skip)).toBeGreaterThanOrEqual(0);
  expect(children.indexOf(skip)).toBeLessThan(children.indexOf(inset));
});

test("[UC2] tappableBottomInset 키 없음(iOS · 제스처) → 상자 없음, 건너뛰기가 마지막", () => {
  setGlobalProps({ safeAreaInsets: { top: 0, bottom: 34, left: 0, right: 0 } });
  renderSheet();

  expect(screen.queryByTestId("episode-survey-inset")).toBeNull();
  const content = screen.getByTestId("ui-lynx-bottom-sheet-content");
  const children = Array.from(content.children);
  expect(children[children.length - 1]).toBe(screen.getByTestId("episode-survey-skip"));
});

test("[UC2b] tappableBottomInset 0 → 상자 없음", () => {
  setGlobalProps({ tappableBottomInset: 0 });
  renderSheet();

  expect(screen.queryByTestId("episode-survey-inset")).toBeNull();
});
