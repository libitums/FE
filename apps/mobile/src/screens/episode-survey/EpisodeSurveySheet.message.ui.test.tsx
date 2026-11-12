import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeSurveySheet } from "./EpisodeSurveySheet";

// `ui` 계층: 1~3점은 글 단계를 거치고, 4 · 5점은 지금처럼 바로 끝나는지 봅니다(ADR-0036 개정 2026-11-12).
// 글 단계의 닫는 길(Not now · 닫기 · 뒤로)은 건너뛰기가 아니라 「그 별점 + 글 없음」의 답입니다.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    // 남은 핸들러를 비웁니다.
  }
});

function setup() {
  const onAnswer = vi.fn<(rating: number, message: string | null) => void>();
  const onSkip = vi.fn<() => void>();
  render(<EpisodeSurveySheet episodeTitle="Tutorial" onAnswer={onAnswer} onSkip={onSkip} />);
  return { onAnswer, onSkip };
}

const pick = (rating: number) =>
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${rating}`), {});

const tapButtonIn = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

function type(value: string): void {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView!.CustomEvent;
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

test("[ESM1] 5점은 누르는 즉시 (5, null)로 답하고 글 칸을 열지 않는다", () => {
  const { onAnswer, onSkip } = setup();
  pick(5);
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(5, null);
  expect(onSkip).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-survey-message")).toBeNull();
});

test("[ESM2] 2점은 답하지 않고 별점 보기 대신 글 칸 · Send · Not now를 보인다", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  expect(onAnswer).not.toHaveBeenCalled();
  expect(onSkip).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-survey-options")).toBeNull();
  expect(screen.getByTestId("episode-survey-message")).toHaveTextContent(
    "What could be better? (optional)",
  );
  expect(screen.getByTestId("episode-survey-send")).toHaveTextContent("Send");
  expect(screen.getByTestId("episode-survey-skip")).toHaveTextContent("Not now");
});

test("[ESM3] 글을 쓰고 Send → (2, 앞뒤 공백 지운 글)", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  type("  The audio was too fast.  ");
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, "The audio was too fast.");
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM3b] 글 없이 Send → (1, null)", () => {
  const { onAnswer } = setup();
  pick(1);
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(1, null);
});

test("[ESM4] 3점 → Not now는 건너뛰기가 아니라 (3, null)의 답이다", () => {
  const { onAnswer, onSkip } = setup();
  pick(3);
  type("draft");
  tapButtonIn("episode-survey-skip");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(3, null);
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM5] 1점 → 시스템 뒤로 → (1, null)", () => {
  const { onAnswer, onSkip } = setup();
  pick(1);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(1, null);
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM6] 2점 → 닫기 버튼 → (2, null)", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, null);
  expect(onSkip).not.toHaveBeenCalled();
});

function keyboardHeight(height: number): void {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView!.CustomEvent;
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
  );
}

test("[ESM7] 글 단계에서 키보드가 올라오면 그 높이만큼 아래를 비워 시트를 올리고, 내려가면 거둔다", () => {
  setup();
  pick(2);
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();

  keyboardHeight(336);
  expect(screen.getByTestId("episode-survey-keyboard")).toHaveStyle({ height: "336px" });

  keyboardHeight(0);
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();
});
