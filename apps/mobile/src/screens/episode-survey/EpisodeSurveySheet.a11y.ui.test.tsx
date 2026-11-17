import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import * as inputFocus from "../messenger-chat/chat-input-focus";
import { EpisodeSurveySheet, episodeSurveyReasonsLabelId } from "./EpisodeSurveySheet";

vi.mock("../messenger-chat/chat-input-focus", () => ({
  restoreAccessibilityFocus: vi.fn<(id: string) => void>(),
}));

// `ui` 계층 — 접근성(a11y M1): 1~3점을 누르면 사라진 보기 대신 이유 질문으로 접근성 초점을 옮기고, 고른 별점을 낭독합니다.
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

test("[ESM-A1] 2점 → 다음 프레임에 이유 질문(접근성 요소)으로 초점을 옮기고 고른 별점을 낭독한다", () => {
  const { accessibilityAnnounce } = setup();
  pick(2);

  expect(restore()).toHaveBeenCalledExactlyOnceWith(episodeSurveyReasonsLabelId);
  const label = document.querySelector(`[id="${episodeSurveyReasonsLabelId}"]`);
  expect(label?.getAttribute("accessibility-element")).toBe("true");
  expect(label?.getAttribute("accessibility-label")).toBe(
    "What didn't work well? Pick any that apply.",
  );
  // Android는 flatten된 노드를 접근성 트리에서 지워 초점 이동이 조용히 실패합니다 · 제목 탐색은 heading이 집니다(접근성 점검 C1 · m1).
  expect(label?.getAttribute("flatten")).toBe("false");
  expect(label?.getAttribute("accessibility-heading")).toBe("true");
  expect(accessibilityAnnounce).toHaveBeenCalledTimes(1);
  expect(accessibilityAnnounce.mock.calls[0]?.[0]).toEqual({ content: "2 · Could be better" });
});

test("[ESM-A2] 5점 → 초점 이동 · 낭독 없음", () => {
  const { accessibilityAnnounce } = setup();
  pick(5);
  expect(restore()).not.toHaveBeenCalled();
  expect(accessibilityAnnounce).not.toHaveBeenCalled();
});

test("[ESM-A3] 「Other」 항목은 고르면 글 칸이 열린다는 것까지 이름으로 알린다(접근성 점검 m3)", () => {
  setup();
  pick(2);
  const other = document.querySelector('[data-testid="ui-lynx-option-selector-item-other"]');
  expect(other?.getAttribute("accessibility-label")).toBe("Other, opens a text box");
});
