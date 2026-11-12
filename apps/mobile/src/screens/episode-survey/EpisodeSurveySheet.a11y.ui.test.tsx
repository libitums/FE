import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import * as inputFocus from "../messenger-chat/chat-input-focus";
import { EpisodeSurveySheet, episodeSurveyMessageInputId } from "./EpisodeSurveySheet";

vi.mock("../messenger-chat/chat-input-focus", () => ({
  restoreAccessibilityFocus: vi.fn<(id: string) => void>(),
}));

// `ui` 계층 — 접근성(a11y M1): 1~3점을 누르면 사라진 보기 대신 글 칸으로 접근성 초점을 옮기고, 고른 별점을 낭독합니다.
// 4 · 5점은 시트가 닫히므로 둘 다 없습니다.

const restore = () => vi.mocked(inputFocus.restoreAccessibilityFocus);

function setup() {
  const accessibilityAnnounce = vi.fn();
  vi.stubGlobal("NativeModules", { LynxAccessibilityModule: { accessibilityAnnounce } });
  vi.useFakeTimers();
  render(<EpisodeSurveySheet episodeTitle="Tutorial" onAnswer={vi.fn()} onSkip={vi.fn()} />);
  return { accessibilityAnnounce };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  restore().mockClear();
  while (backHandlers.runTop()) {
    // 남은 핸들러를 비웁니다.
  }
});

function pick(rating: number): void {
  fireEvent.tap(
    document.querySelector(`[data-testid="ui-lynx-option-selector-item-${rating}"]`) as Element,
    {},
  );
  act(() => {
    vi.advanceTimersByTime(50);
  });
}

test("[ESM-A1] 2점 → 다음 프레임에 글 칸(접근성 요소)으로 초점을 옮기고 고른 별점을 낭독한다", () => {
  const { accessibilityAnnounce } = setup();
  pick(2);

  expect(restore()).toHaveBeenCalledExactlyOnceWith(episodeSurveyMessageInputId);
  const input = document.querySelector(`[id="${episodeSurveyMessageInputId}"]`);
  expect(input?.getAttribute("accessibility-element")).toBe("true");
  expect(accessibilityAnnounce).toHaveBeenCalledTimes(1);
  expect(accessibilityAnnounce.mock.calls[0]?.[0]).toEqual({ content: "2 · Could be better" });
});

test("[ESM-A2] 5점 → 초점 이동 · 낭독 없음", () => {
  const { accessibilityAnnounce } = setup();
  pick(5);
  expect(restore()).not.toHaveBeenCalled();
  expect(accessibilityAnnounce).not.toHaveBeenCalled();
});
