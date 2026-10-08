import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeSurveySheet } from "./EpisodeSurveySheet";

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[UL10] 설문 시트 → 뒤로가기는 onSkip 1회(건너뛰기) · onAnswer 0회", () => {
  const onSkip = vi.fn<() => void>();
  const onAnswer = vi.fn();
  render(<EpisodeSurveySheet episodeTitle="Tutorial" onAnswer={onAnswer} onSkip={onSkip} />);

  expect(pressBack()).toBe(true);

  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(onAnswer).not.toHaveBeenCalled();
});
