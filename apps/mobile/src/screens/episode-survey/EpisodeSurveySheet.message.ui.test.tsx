import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeSurveySheet } from "./EpisodeSurveySheet";

// `ui` 계층: 1~3점은 이유 체크리스트 단계를 거치고, 4 · 5점은 지금처럼 바로 끝나는지 봅니다(ADR-0036 개정 2026-11-17).
// 글 칸은 「Other」를 고른 동안만 섭니다. 이유 단계의 닫는 길(Not now · 닫기 · 뒤로)은 건너뛰기가 아니라
// 「그 별점 + 이유 없음 + 글 없음」의 답입니다.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    // 남은 핸들러를 비웁니다.
  }
});

function setup() {
  const onAnswer =
    vi.fn<(rating: number, reasons: readonly string[], message: string | null) => void>();
  const onSkip = vi.fn<() => void>();
  render(<EpisodeSurveySheet episodeTitle="Tutorial" onAnswer={onAnswer} onSkip={onSkip} />);
  return { onAnswer, onSkip };
}

const pick = (rating: number) =>
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-${rating}`), {});

/** 이유 체크리스트의 항목을 누릅니다(다시 누르면 풉니다). */
const check = (reason: string) =>
  fireEvent.tap(
    within(screen.getByTestId("episode-survey-reasons")).getByTestId(
      `ui-lynx-option-selector-item-${reason}`,
    ),
    {},
  );

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

test("[ESM1] 5점은 누르는 즉시 (5, [], null)로 답하고 체크리스트를 열지 않는다", () => {
  const { onAnswer, onSkip } = setup();
  pick(5);
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(5, [], null);
  expect(onSkip).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-survey-reasons")).toBeNull();
});

test("[ESM2] 2점은 답하지 않고 별점 보기 대신 이유 질문 · 여덟 항목 · Send · Not now를 보인다, 글 칸은 아직 없다", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  expect(onAnswer).not.toHaveBeenCalled();
  expect(onSkip).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-survey-options")).toBeNull();
  const reasons = screen.getByTestId("episode-survey-reasons");
  expect(reasons).toHaveTextContent("What didn't work well? Pick any that apply.");
  for (const label of [
    "Too hard",
    "Too easy",
    "Audio problems",
    "Hard to understand",
    "Translation issues",
    "Got stuck or bug",
    "Too long",
    "Other",
  ]) {
    expect(reasons).toHaveTextContent(label);
  }
  expect(screen.queryByTestId("episode-survey-message")).toBeNull();
  // 설명(「You finished …」)은 질문이 대신해 내립니다 — 360×640에서 여덟 항목이 한 화면에 들게(기기 확인).
  expect(screen.queryByText(/You finished Tutorial/)).toBeNull();
  expect(screen.getByTestId("episode-survey-send")).toHaveTextContent("Send");
  expect(screen.getByTestId("episode-survey-skip")).toHaveTextContent("Not now");
});

test("[ESM3] 여러 이유를 고르고 Send → (2, 표시 순서의 이유, null)", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  check("audio");
  check("too-hard");
  check("stuck");
  check("stuck");
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, ["too-hard", "audio"], null);
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM3b] 아무것도 고르지 않고 Send → (1, [], null)", () => {
  const { onAnswer } = setup();
  pick(1);
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(1, [], null);
});

test("[ESM3c] Other를 고르면 글 칸이 서고, 글을 쓰고 Send → (2, [other], 앞뒤 공백 지운 글)", () => {
  const { onAnswer } = setup();
  pick(2);
  check("other");
  expect(screen.getByTestId("episode-survey-message")).toHaveTextContent(
    "What could be better? (optional)",
  );
  type("  The audio was too fast.  ");
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, ["other"], "The audio was too fast.");
});

test("[ESM3d] Other를 풀면 글 칸이 사라지고 쓴 글은 보내지 않는다", () => {
  const { onAnswer } = setup();
  pick(3);
  check("other");
  type("draft");
  check("other");
  expect(screen.queryByTestId("episode-survey-message")).toBeNull();
  check("too-long");
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(3, ["too-long"], null);
});

test("[ESM3e] Other를 풀었다가 다시 고르면 글 칸은 비어 있고, 바로 Send해도 이전 글을 보내지 않는다(리뷰 C1)", () => {
  const { onAnswer } = setup();
  pick(2);
  check("other");
  type("draft");
  check("other");
  check("other");
  tapButtonIn("episode-survey-send");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, ["other"], null);
});

test("[ESM4] 3점 → 이유를 골라도 Not now는 건너뛰기가 아니라 (3, [], null)의 답이다", () => {
  const { onAnswer, onSkip } = setup();
  pick(3);
  check("audio");
  tapButtonIn("episode-survey-skip");
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(3, [], null);
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM5] 1점 → 시스템 뒤로 → (1, [], null)", () => {
  const { onAnswer, onSkip } = setup();
  pick(1);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(1, [], null);
  expect(onSkip).not.toHaveBeenCalled();
});

test("[ESM6] 2점 → 닫기 버튼 → (2, [], null)", () => {
  const { onAnswer, onSkip } = setup();
  pick(2);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(2, [], null);
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

test("[ESM7] Other 글 칸에서 키보드가 올라오면 그 높이만큼 아래를 비워 시트를 올리고, 내려가면 거둔다", () => {
  setup();
  pick(2);
  check("other");
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();

  keyboardHeight(336);
  expect(screen.getByTestId("episode-survey-keyboard")).toHaveStyle({ height: "336px" });

  keyboardHeight(0);
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();
});

test("[ESM7b] 키보드가 내려간 뒤 Other를 풀었다가 다시 고르면 키보드 칸이 남지 않는다(리뷰 W1 — 키보드가 선 동안은 체크리스트가 없어 풀 수 없음)", () => {
  setup();
  pick(2);
  check("other");
  keyboardHeight(336);
  expect(screen.queryByTestId("episode-survey-reasons")).toBeNull();
  keyboardHeight(0);
  check("other");
  check("other");
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();
});

test("[ESM8] 체크리스트만 스크롤 칸 안에 두고 글 칸 · Send · Not now는 밖에 둔다(360×640 기기 확인 — 내용 칸은 줄기만 함)", () => {
  setup();
  pick(2);
  check("other");
  const scroll = screen.getByTestId("episode-survey-reasons-scroll");
  expect(scroll.tagName.toLowerCase()).toBe("scroll-view");
  expect(scroll).toContainElement(screen.getByTestId("episode-survey-reasons"));
  for (const id of ["episode-survey-message", "episode-survey-send", "episode-survey-skip"]) {
    expect(scroll).not.toContainElement(screen.getByTestId(id));
  }
});

test("[ESM7c] 키보드가 선 동안은 체크리스트 · Not now를 내려 Send가 키보드 위에 남게 하고, 키보드가 내려가면 되돌린다(360×640 기기 확인)", () => {
  setup();
  pick(2);
  check("other");
  keyboardHeight(336);
  expect(screen.queryByTestId("episode-survey-skip")).toBeNull();
  expect(screen.queryByTestId("episode-survey-reasons-scroll")).toBeNull();
  expect(screen.getByTestId("episode-survey-message")).toBeInTheDocument();
  expect(screen.getByTestId("episode-survey-send")).toBeInTheDocument();
  keyboardHeight(0);
  expect(screen.getByTestId("episode-survey-skip")).toBeInTheDocument();
  expect(screen.getByTestId("episode-survey-reasons")).toHaveTextContent("Other");
});

test("[ESM7d] Android는 키보드가 닫혀도 아래 내비게이션 높이(24)를 보낸다 — 그 값은 닫힘으로 보고 체크리스트 · Not now를 되돌린다(기기 로그 2026-11-17)", () => {
  setup();
  pick(2);
  check("other");
  keyboardHeight(299);
  expect(screen.queryByTestId("episode-survey-reasons")).toBeNull();
  keyboardHeight(24);
  expect(screen.getByTestId("episode-survey-reasons")).toBeInTheDocument();
  expect(screen.getByTestId("episode-survey-skip")).toBeInTheDocument();
  expect(screen.queryByTestId("episode-survey-keyboard")).toBeNull();
});
