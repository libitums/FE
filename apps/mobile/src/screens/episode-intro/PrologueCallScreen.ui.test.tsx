import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { PrologueCall } from "./episode-intro.contract";
import { PrologueCallScreen } from "./PrologueCallScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 대본은 이 파일 안의 fixture로
// 줍니다(`prologue-call.ts`의 표를 import하지 않습니다). 대사 한 줄은 3초 머뭅니다.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const call: PrologueCall = {
  callerName: "Minseo",
  lines: [
    { text: "여보세요?", translation: "Hello?" },
    { text: "이따 봐!", translation: "See you later!" },
  ],
};

function renderCall(
  overrides: Partial<Parameters<typeof PrologueCallScreen>[0]> = {},
  accept = true,
) {
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 0.",
    call,
    callerPortrait: "portrait.png",
    onComplete: vi.fn<() => void>(),
    onBack: vi.fn<() => void>(),
    ...overrides,
  };
  render(<PrologueCallScreen {...props} />);
  if (accept) fireEvent.tap(screen.getByTestId("prologue-call-screen-accept"), {});
  return props;
}

function advance(seconds: number): void {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

test("[PC1] 머리 · 통화 상대 · 첫 대사를 그린다", () => {
  vi.useFakeTimers();
  renderCall();
  advance(0.2);

  expect(screen.getByTestId("prologue-call-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("prologue-call-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "Voice call, Minseo",
  );
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  expect(screen.getByTestId("prologue-call-screen-line-translation")).toHaveTextContent("Hello?");
  expect(screen.getByTestId("prologue-call-screen-line")).toHaveAttribute(
    "accessibility-label",
    "여보세요?, Hello?",
  );
});

test("[PC2] 시계가 1초마다 가고 대사가 3초마다 넘어간다", () => {
  vi.useFakeTimers();
  renderCall();

  advance(1);
  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:01");
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");

  advance(2);
  expect(screen.getByTestId("prologue-call-screen-line")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  advance(0.2);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("이따 봐!");
});

test("자막은 글자별로 출력하고 종료하면 현재 자막과 번역을 완성한다", () => {
  vi.useFakeTimers();
  const startTimer = vi.spyOn(globalThis, "setInterval");
  const clearTimer = vi.spyOn(globalThis, "clearInterval");
  renderCall();
  expect(screen.getByTestId("prologue-call-screen-line-translation")).toHaveStyle({
    visibility: "hidden",
  });
  advance(0.035);
  expect(screen.getByTestId("prologue-call-screen-line-text").textContent).toBe("여");
  advance(0.035);
  expect(screen.getByTestId("prologue-call-screen-line-text").textContent).toBe("여보");
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  expect(screen.getByTestId("prologue-call-screen-line-translation")).toHaveTextContent("Hello?");
  for (const timer of startTimer.mock.results) {
    expect(clearTimer).toHaveBeenCalledWith(timer.value);
  }
});

test("긴 자막도 전환 전에 다 출력하고 같은 문장이 이어져도 다시 타이핑한다", () => {
  vi.useFakeTimers();
  const text = "가".repeat(100);
  renderCall({
    call: {
      callerName: "Minseo",
      lines: [
        { text, translation: "First" },
        { text, translation: "Second" },
      ],
    },
  });
  advance(2);
  expect(screen.getByTestId("prologue-call-screen-line-text").textContent).toBe(text);
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-line")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  advance(0.02);
  expect(screen.getByTestId("prologue-call-screen-line-text").textContent).toBe("가");
});

test("[PC3] 마지막 대사가 머문 뒤 통화 버튼 줄이 걷히고 하단에 Continue가 선다", () => {
  vi.useFakeTimers();
  const props = renderCall();
  expect(screen.queryByTestId("prologue-call-screen-complete")).not.toBeInTheDocument();

  advance(6);

  expect(screen.queryByTestId("prologue-call-screen-end")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen-mute")).not.toBeInTheDocument();
  const complete = screen.getByTestId("prologue-call-screen-complete");
  expect(complete).toHaveTextContent("Continue");
  expect(complete).toHaveAttribute("accessibility-traits", "button");
  // 끝나는 것만으로는 다음으로 가지 않습니다.
  expect(props.onComplete).not.toHaveBeenCalled();
});

test("[PC3b] 끝난 뒤 시계가 멈추고 마지막 대사가 남는다", () => {
  vi.useFakeTimers();
  renderCall();

  advance(6);
  advance(10);

  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:06");
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("이따 봐!");
});

test("[PC4] 종료 버튼 tap → 통화가 끝나 Continue가 서고, onComplete는 아직 0회", () => {
  const props = renderCall();

  const end = screen.getByTestId("prologue-call-screen-end");
  expect(end).toHaveAttribute("accessibility-label", "End call");
  fireEvent.tap(end, {});

  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
  expect(props.onComplete).not.toHaveBeenCalled();
  expect(props.onBack).not.toHaveBeenCalled();
});

test("[PC4b] Continue tap → onComplete 1회", () => {
  const props = renderCall();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});

  expect(props.onComplete).toHaveBeenCalledTimes(1);
});

test("[PC5] 뒤로 tap → onBack 1회, onEnd 0회", () => {
  const props = renderCall();

  fireEvent.tap(screen.getByTestId("prologue-call-screen-back"), {});

  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onComplete).not.toHaveBeenCalled();
});

test("받기 전에는 시계와 자막이 없고 시간이 지나도 통화를 시작하지 않는다", () => {
  vi.useFakeTimers();
  renderCall({}, false);
  advance(10);
  expect(screen.queryByTestId("prologue-call-screen-clock")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen-line")).not.toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-accept")).toHaveTextContent("Accept");
  fireEvent.tap(screen.getByTestId("prologue-call-screen-accept"), {});
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:01");
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
});

test("[ST2-M] 문구표에서 읽는다 — 통화 상대 · 받기 · 종료 · 완료", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <PrologueCallScreen
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        episodeLabel="Episode 0."
        call={call}
        callerPortrait="portrait.png"
        onComplete={vi.fn<() => void>()}
        onBack={vi.fn<() => void>()}
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "⟦phoneCall.voiceCall⟧(Minseo)",
  );
  expect(screen.getByTestId("prologue-call-screen-accept")).toHaveAttribute(
    "accessibility-label",
    "⟦phoneCall.play.start⟧",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-accept"), {});
  expect(screen.getByTestId("prologue-call-screen-end")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.endCall⟧",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});
  expect(screen.getByTestId("prologue-call-screen-complete")).toHaveTextContent(
    "⟦common.continue⟧",
  );
});
